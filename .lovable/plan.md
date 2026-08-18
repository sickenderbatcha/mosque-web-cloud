# Committee members: mobile number and address

Add contact details to committee members and show them where members are listed.

## Database
Add two nullable text columns to the `management_committee` table:
- `phone`
- `address`

## Admin form (Committee tab)
- Add "Mobile Number / கைபேசி எண்" and "Address / முகவரி" (multi-line) fields to the Add/Edit dialog.
- Save both on create and update; blank values stored as empty.
- Show the mobile number under each member card in the admin list.

## Public display
- Homepage "நிர்வாகக் குழு உறுப்பினர்கள்" section: show mobile number (as a tap-to-call link) and address below the name/position, only when present.
- About page committee list: same additions, matching its existing card style.

## Note on visibility
The committee list is publicly readable, so phone numbers and addresses entered here will be visible to any site visitor. Leave the fields blank for members who should not be listed publicly.
