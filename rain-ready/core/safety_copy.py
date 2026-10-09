"""ALL user-facing safety text lives here, pre-written. NO LLM writes or rephrases any of it. Owner: P4.

Hindi/English. The Hindi MUST be checked by a native speaker and the English by someone with
disaster-management judgement before any real (non-team) send. See HANDOFF.md section 9.
Banned words (tested): the bare word 'safe', 'guarantee', 'desilted', 'removed', 'cm deep'.
"""
from __future__ import annotations

import re

FOOTER = {
    "en": "Unofficial preparedness checklist. Official warnings: IMD / NDMA Sachet.",
    "hi": "अनौपचारिक तैयारी सूची। आधिकारिक चेतावनी: IMD / NDMA Sachet।",
}
INFO_ONLY = {
    "en": "Self-declared by the building. Information only. Not a safety certificate.",
    "hi": "भवन द्वारा स्वयं घोषित। केवल जानकारी। यह सुरक्षा प्रमाणपत्र नहीं है।",
}
NEVER_DRIVE = {
    "en": "Never drive or walk into water at an underpass. Stay away from water near wires, poles and open drains.",
    "hi": "अंडरपास के पानी में कभी गाड़ी न चलाएँ और न पैदल जाएँ। तारों, खंभों और खुले नालों के पास के पानी से दूर रहें।",
}

# Standing checklist, warning ACTIVE. Same content for every enrolled building; level only adds an extra line.
CHECKLIST = {
    "en": [
        "An official heavy-rain warning is active. Keep everyone out of the basement for the warning period.",
        "Move vehicles, stock and papers up to higher floors now.",
        "Keep the basement exit clear. Do not let anyone go down to fetch things once water enters.",
        "Ask your electrician today how to switch off basement power from a dry place.",
        "Look at the drain in front of your building from the footpath. If it looks blocked, report it here with a photo.",
    ],
    "hi": [
        "भारी बारिश की आधिकारिक चेतावनी जारी है। चेतावनी की अवधि में सभी को बेसमेंट से बाहर रखें।",
        "गाड़ियाँ, सामान और कागज़ात अभी ऊपरी मंज़िल पर ले जाएँ।",
        "बेसमेंट का निकास खुला रखें। पानी भरने लगे तो सामान लेने के लिए किसी को नीचे न जाने दें।",
        "आज ही अपने इलेक्ट्रीशियन से पूछें कि बेसमेंट की बिजली सूखी जगह से कैसे बंद करें।",
        "फुटपाथ से अपनी इमारत के सामने का नाला देखें। रुका लगे तो फ़ोटो के साथ यहाँ रिपोर्ट करें।",
    ],
}
EXTRA_BY_LEVEL = {
    "HIGH_ATTENTION": {
        "en": "Your answers put this building in the high-attention group: a basement in use needs the most care.",
        "hi": "आपके उत्तरों के अनुसार यह इमारत उच्च-ध्यान श्रेणी में है: उपयोग में आ रहे बेसमेंट पर सबसे अधिक ध्यान दें।",
    },
    "ELEVATED": {
        "en": "Your answers put this building in the elevated group.",
        "hi": "आपके उत्तरों के अनुसार यह इमारत बढ़े हुए जोखिम वाली श्रेणी में है।",
    },
    "NO_SPECIFIC_FLAG": {
        "en": "No specific flag from your answers. This is not a statement that your building is free of risk.",
        "hi": "आपके उत्तरों से कोई विशेष संकेत नहीं मिला। इसका अर्थ यह नहीं कि आपकी इमारत में कोई जोखिम नहीं है।",
    },
}
# Shown when no warning is active (preparedness, not alert).
STANDING_ADVICE = {
    "en": "No official warning is active now. Keep this checklist ready. You will see it as a banner when a warning is entered.",
    "hi": "अभी कोई आधिकारिक चेतावनी जारी नहीं है। यह सूची तैयार रखें। चेतावनी दर्ज होने पर यह बैनर के रूप में दिखेगी।",
}
LIVE_WIRE = {
    "en": "Stay well away. Do not touch the wire, pole or water near it. Move people back. Call your power company's emergency line and 112.",
    "hi": "दूर रहें। तार, खंभे या उसके पास के पानी को न छुएँ। लोगों को पीछे हटाएँ। अपनी बिजली कंपनी की आपातकालीन लाइन और 112 पर कॉल करें।",
}
OPEN_MANHOLE = {
    "en": "Keep away from the open manhole and warn others. Do not try to cover or enter it. Report it to the owner agency.",
    "hi": "खुले मैनहोल से दूर रहें और दूसरों को सावधान करें। उसे ढकने या उसमें उतरने की कोशिश न करें। संबंधित एजेंसी को सूचित करें।",
}
FIELD_RULES = {
    "en": [
        "Never lift or open a manhole cover.",
        "Photograph open drains only from the kerb or bank. Never step in.",
        "Not during or right after rain, not at night, not alone.",
    ],
    "hi": [
        "मैनहोल का ढक्कन कभी न उठाएँ और न खोलें।",
        "खुले नालों की फ़ोटो केवल सड़क के किनारे या किनारे से लें। अंदर कभी न उतरें।",
        "बारिश के दौरान या तुरंत बाद नहीं, रात में नहीं, अकेले नहीं।",
    ],
}

BANNED = re.compile(r"\bsafe\b|guarantee|desilted|removed|cm deep", re.IGNORECASE)


def building_message(level: str, lang: str, storm_active: bool) -> dict:
    lang = lang if lang in ("en", "hi") else "en"
    body = CHECKLIST[lang] if storm_active else [STANDING_ADVICE[lang]]
    return {
        "lang": lang,
        "storm_active": storm_active,
        "headline": EXTRA_BY_LEVEL[level][lang],
        "items": body,
        "always": NEVER_DRIVE[lang],
        "footer": FOOTER[lang],
    }


def hazard_text(category: str, lang: str) -> str | None:
    lang = lang if lang in ("en", "hi") else "en"
    if category == "live_wire":
        return LIVE_WIRE[lang]
    if category == "open_manhole":
        return OPEN_MANHOLE[lang]
    return None


def all_strings() -> list[str]:
    out: list[str] = []
    for d in (FOOTER, INFO_ONLY, NEVER_DRIVE, STANDING_ADVICE, LIVE_WIRE, OPEN_MANHOLE):
        out += list(d.values())
    for d in (CHECKLIST, FIELD_RULES):
        for v in d.values():
            out += v
    for d in EXTRA_BY_LEVEL.values():
        out += list(d.values())
    return out
