"""Raw OSM data must not keep business contact details."""
from scripts.fetch_sources import strip_contact


def test_contact_tags_are_dropped_and_others_kept():
    doc = {"elements": [{"id": 1, "tags": {"name": "School", "phone": "+91 1", "contact:email": "a@b.c",
                                           "website": "x", "amenity": "school", "addr:full": "Karol Bagh"}},
                        {"id": 2}]}
    out = strip_contact(doc)
    assert out["elements"][0]["tags"] == {"name": "School", "amenity": "school", "addr:full": "Karol Bagh"}
    assert out["elements"][1] == {"id": 2}
