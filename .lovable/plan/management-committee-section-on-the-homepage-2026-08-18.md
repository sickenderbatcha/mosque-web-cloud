# Management Committee section on the homepage

Add a new homepage section showing the current management committee members, exactly as maintained by admins in the Committee page.

## What you get

- A new section titled "நிர்வாகக் குழு உறுப்பினர்கள் / Management Committee Members", placed directly below the hero section by default.
- Cards for each current member: photo (fallback avatar icon if none uploaded), name, position, and father's name where available.
- Data comes live from the same records admins manage in the Committee tab (only members marked current, ordered by their sort order). The section hides itself when there are no members.
- It becomes a normal homepage section: it can be reordered or switched off from the Homepage Section Order manager in admin settings.

## Technical notes

- Add `{ id: "committee", label: "Management Committee", labelTamil: "நிர்வாகக் குழு உறுப்பினர்கள்", enabled: true, order: 1 }` to `DEFAULT_SECTIONS` in `src/hooks/useHomepageSectionOrder.tsx` and shift subsequent default orders down by one. Existing saved orders merge with defaults, so the new section appears with its default order for users who already saved a custom order.
- Create `src/components/CommitteeSection.tsx`: fetches `management_committee` where `is_current = true` ordered by `sort_order`, renders a responsive grid (2 / 3 / 5 columns) with rounded photos, using existing semantic tokens and the `font-tamil` class for Tamil text, plus the same framer-motion fade-in used by other homepage sections.
- Add a `case "committee"` branch in `renderSection` in `src/pages/HomePage.tsx` returning the new component.
- Read-only public fetch; no schema or policy changes.
