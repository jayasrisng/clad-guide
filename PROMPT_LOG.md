# Guide — Consolidated Prompt Log

These three prompts summarize the full Guide product and can be reused to rebuild, continue, or verify the experience.

## Prompt 1 — Complete Guide Product Flow

Update the existing Lens Studio Specs project in place. Do not create, move, publish, optimize, or restructure the project.

Build a Guide experience with this flow:

1. Start on an empty screen titled **“Paste your host’s check-in instructions.”**
2. Show a large text input with a readable example placeholder, such as:
   “Enter through the black gate and use code 2345. Walk through the lobby and go upstairs to the third floor. Turn left, find the blue door, and enter code 5236.”
3. Add a **Create My Guide** button.
4. Parse the pasted instructions into correctly ordered navigation steps and display them briefly.
5. Show the animated Snap ghost asking:
   **“Have you been dropped off at the location?”**
   with **Yes, I’m here** and **Not yet** buttons.
6. **Not yet** must keep the guest waiting at the confirmation screen.
7. **Yes, I’m here** starts the existing Paris spatial Guide.
8. Guide the guest through the Paris building images in order: exterior, black gate/code 2345, lobby, stairs, hallway turn, and the final blue door/code 5236.
9. After code 5236, go directly inside. Do not add another door step.
10. Start the Room Guide using the clean new interior image from the existing Building folder.
11. End with a compact completion popup:
    **“You’re all set ✨”**
    with **Replay Room Guide** and **Start Over**.

Use one consistent premium visual system throughout: near-black cards, thin gold borders, white text, gold accents, rounded corners, strong contrast, and the animated Snap ghost as a companion.

## Prompt 2 — Spatial Guide and Room Guide Experience

Keep the existing paste-instructions and arrival-confirmation flow unchanged. Improve only the spatial guidance experience.

For building navigation:

- Make each building image dominate the view.
- Avoid large fixed panels or gray cards.
- Show one short instruction at a time in a compact text-fitting black-and-gold bubble.
- Position labels beside the referenced object so gates, stairs, hallways, doors, lockboxes, and keypads remain visible.
- Use glowing gold markers and directional arrows.
- Put **Enter 2345** beside the exterior keypad and **Enter 5236** beside the final blue-door keypad.
- Keep progress subtle.
- Keep Previous/Next only as small Preview demo controls.
- Add a small restart icon in a corner.
- Animate the Snap ghost subtly toward each current target so it feels like it is leading the guest.

For Room Guide:

- Use the clean new room image as the full main scene without washing it out.
- Begin with a brief clean-room moment and a small ghost welcome.
- Reveal only one item at a time:
  1. Wi-Fi — ParisGuest / bonjour123
  2. Light switch
  3. Spare blanket
  4. Thermostat
  5. Fresh towels
  6. Kitchen essentials
  7. Checkout at 11 AM
- Place each marker close to the corresponding visible object.
- Animate each popup with a small scale-up, glow, or pulse.
- Make the active popup directly tappable.
- On tap, pop/fade the current item away and reveal the next item.
- Do not show large Room Guide Previous/Next arrows.
- Show subtle progress such as **ROOM 1 / 7**.
- After the checkout item is tapped, show the compact completion popup.

The result should feel spatial, light, magical, uncluttered, and like the host is personally walking the guest through the property.

## Prompt 3 — Reset, Replay, and Demo-Readiness QA

Perform a demo-readiness pass on the existing Guide Lens Studio project using SPECS 27 Preview. Fix only clear bugs, clipping, unreadable UI, broken interactions, or incorrect reset state. Do not add unrelated features, publish, optimize, or redesign.

Verify the complete flow:

**Paste instructions → Create My Guide → generated steps → arrival confirmation → Not yet → Yes, I’m here → Paris Guide → code 5236 → Room Guide → completion**

Verify that:

- Fresh startup always shows an empty input with the sample placeholder.
- Parsed steps appear in the correct order.
- Not yet remains on the waiting screen.
- Yes starts the spatial Guide.
- Every navigation step advances exactly once.
- The extra door step is absent.
- Labels, markers, ghost, codes, and controls remain inside the Specs field of view.
- No label obscures the gate, keypad, stairs, hallway, or final door.
- The Room Guide uses the new room image and never displays the old room.
- Room items appear one at a time and advance by tapping the active popup.
- The final completion popup is readable and interactive.
- **Replay Room Guide** clears dismissed room markers and restarts at Wi-Fi while remaining in the room.
- **Start Over** clears the pasted text, parsed steps, route index, room index, timers, navigation locks, progress, markers, and completion state, then returns to the original empty entry screen.
- The small restart icon performs the same full reset from any spatial Guide step.
- A second run behaves exactly like a fresh launch.
- There are no TypeScript or Guide runtime errors.
- The existing project is saved at its original location.

At the end, provide a short PASS/FAIL report and note only information relevant before screen recording.
