"""S3 storage and Bedrock triage paths, checked with a fake boto3 client (no AWS account needed)."""
import pytest

from ai import triage
from app import config, main, storage

from .conftest import as_, fresh_png

IMG = fresh_png()      # a readable image: the model copy is prepared before the call


class FakeS3:
    def __init__(self):
        self.puts, self.signed = [], []

    def put_object(self, **kw):
        self.puts.append(kw)

    def generate_presigned_url(self, op, Params, ExpiresIn):
        self.signed.append((op, Params, ExpiresIn))
        return f"https://signed.example/{Params['Key']}"


@pytest.fixture()
def s3(monkeypatch):
    fake = FakeS3()
    fake.client_kwargs = []
    import boto3

    def make(name, **kw):
        fake.client_kwargs.append((name, kw))
        return fake
    monkeypatch.setattr(boto3, "client", make)
    monkeypatch.setattr(config, "STORAGE", "s3")
    monkeypatch.setattr(config, "S3_BUCKET", "bkt")
    return fake


def test_save_photo_puts_to_bucket(s3):
    key = storage.save_photo(b"img", "image/png")
    assert key.endswith(".png")
    assert s3.puts == [{"Bucket": "bkt", "Key": key, "Body": b"img", "ContentType": "image/png"}]


def test_s3_client_is_regional_and_signs_v4(s3, client):
    """A new bucket answers the global host with a redirect that breaks the signature (403 on photos)."""
    storage.save_photo(b"img", "image/png")
    client.get("/media/abc.jpg", follow_redirects=False)
    assert len(s3.client_kwargs) == 2
    for name, kw in s3.client_kwargs:
        assert name == "s3" and kw["region_name"] == config.AWS_REGION
        assert kw["endpoint_url"] == f"https://s3.{config.AWS_REGION}.amazonaws.com"
        assert kw["config"].signature_version == "s3v4"
        assert kw["config"].s3["addressing_style"] == "virtual"


def test_media_redirects_to_presigned_url(s3, client):
    r = client.get("/media/abc.jpg", follow_redirects=False)
    assert r.status_code in (302, 307)
    assert r.headers["location"] == "https://signed.example/abc.jpg"
    assert s3.signed[0][1] == {"Bucket": "bkt", "Key": "abc.jpg"}


def test_media_rejects_path_tricks(s3, client):
    assert client.get("/media/..%2Fx").status_code in (400, 404)


def reply(*texts):
    return {"output": {"message": {"content": [{"text": t} if t is not None else {"reasoning": {}} for t in texts]}}}


@pytest.mark.parametrize("resp,expect", [
    (reply('{"kind":"blocked_drain","summary":"Leaves over a grate."}'), "blocked_drain"),
    (reply('Sure:\n```json\n{"kind":"overflow","summary":"x"}\n```'), "overflow"),
    (reply(None, '{"kind":"other"}'), "other"),              # non-text block first
    (reply('{"kind":"flood","summary":"x"}'), None),         # kind not allowed
    (reply('no json here'), None),
    (reply('{bad json}'), None),
    (reply('[1,2]'), None),
])
def test_parse_reply(resp, expect):
    out = triage.parse_reply(resp)
    assert (out["kind"] if out else None) == expect


def test_summary_is_trimmed():
    out = triage.parse_reply(reply('{"kind":"other","summary":"' + "a" * 500 + '"}'))
    assert len(out["summary"]) == 200


def test_triage_off_by_default(monkeypatch):
    monkeypatch.setattr(config, "TRIAGE_MODE", "manual")
    assert triage.triage_photo(IMG, "image/png") is None


def test_triage_calls_bedrock_and_fails_soft(monkeypatch):
    monkeypatch.setattr(config, "TRIAGE_MODE", "bedrock")
    monkeypatch.setattr(config, "BEDROCK_MODEL_ID", "m-1")
    calls = []

    class Br:
        def converse(self, **kw):
            calls.append(kw)
            return reply('{"kind":"standing_water","summary":"Puddle."}')

    import boto3
    monkeypatch.setattr(boto3, "client", lambda name, **kw: Br())
    out = triage.triage_photo(IMG, "image/png", "note")
    assert out == {"kind": "standing_water", "summary": "Puddle.", "model": "m-1"}
    assert calls[0]["modelId"] == "m-1"

    class Boom:
        def converse(self, **kw):
            raise RuntimeError("AccessDenied")

    monkeypatch.setattr(boto3, "client", lambda name, **kw: Boom())
    assert triage.triage_photo(IMG, "image/png") is None


def test_health_flags_bad_config(client, monkeypatch):
    monkeypatch.setattr(config, "STORAGE", "s3")
    monkeypatch.setattr(config, "S3_BUCKET", "")
    assert any("S3_BUCKET" in w for w in client.get("/api/health").json()["config_warnings"])


@pytest.fixture(autouse=True)
def fresh_deep_cache():
    main._deep.update(at=0.0, value=None)      # the deep result is cached for a few seconds
    yield


def test_health_deep_probes_aws(s3, client):
    r = client.get("/api/health?deep=1", headers=as_("admin-1")).json()
    assert r["aws"] == {"s3": "ok"}
    assert s3.puts[-1]["Key"] == "healthcheck.txt"


def test_health_deep_reports_aws_errors(client, monkeypatch):
    import boto3
    monkeypatch.setattr(config, "STORAGE", "s3")
    monkeypatch.setattr(config, "S3_BUCKET", "b")

    def boom(*a, **k):
        raise RuntimeError("no credentials")
    monkeypatch.setattr(boto3, "client", boom)
    assert "no credentials" in client.get("/api/health?deep=1", headers=as_("admin-1")).json()["aws"]["s3"]
