"""Prompts for the extraction nodes.

Each one asks Claude for STRICT JSON and nothing else, and each one is explicit that
the model must not compute anything — it locates and proposes, the engine disposes.
"""

RATES_PROMPT = """You are extracting a supplier rate catalogue for a travel operator.

From the two sources below (a contracted rate pack and one supplier email), extract
EVERY priced line as a JSON array. Do not compute or convert anything — copy rates
exactly as written.

For each rate output:
- "service_name": the service or room/villa/suite name as written
- "section": where it sits (e.g. "§1 Cape Town Accommodation")
- "rate": the number only (e.g. 340.00)
- "raw_value": the value exactly as written (e.g. "USD 375.00")
- "basis": one of per_room_per_night, per_unit_per_night, per_villa_per_night,
  per_person_sharing_per_night, per_person_per_night, per_person,
  per_person_per_movement, per_vehicle, per_group
- "kind": "pack" for the rate pack, "correspondence" for the email,
  "carried_forward" if the source says the tariff is carried forward / not 2027
- "document": the source filename
- "validity": {{"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}} if stated, else null
- "season": {{"from":"YYYY-MM-DD","to":"YYYY-MM-DD"}} if the rate is seasonal, else null

Output ONLY the JSON array, no prose, no code fences.

=== RATE PACK ({rate_pack_name}) ===
{rate_pack_text}

=== SUPPLIER EMAIL ({email_name}) ===
{email_text}
"""

SERVICES_PROMPT = """You are reading an operational travel quotation. It lists what was
booked, with NO prices. Extract every billable service as a JSON array. Do not invent
prices or totals.

For each service output:
- "id": "svc-01", "svc-02", ... in document order
- "description": a short human description
- "location": the city/area heading it sits under
- "date_in": arrival/service date "YYYY-MM-DD"
- "date_out": checkout date "YYYY-MM-DD" for a stay, else null
- "service_type": accommodation | transfer | activity | flight | levy | meet_greet | supplement | fee
- "room_or_unit": the room/villa/suite name for accommodation, else null
- "pax": number of travellers this service is for (the quote is 5 adults)
- "notes": any "Included: N x ..." extras, or supplier names, verbatim

Treat each "Included: N x ..." extra (trailer, per-group extra, entrance fee,
conservation levy) as its OWN service line. Output ONLY the JSON array.

=== OPERATIONAL QUOTATION ({quotation_name}) ===
{quotation_text}
"""
