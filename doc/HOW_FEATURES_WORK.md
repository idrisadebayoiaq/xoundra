# How Xoundra features work

Version 1.3 · 18 October 2026

Profile shows only **Free** or **Premium**. Prices and the naira charge line live on the Plans screen, not on Profile.

## Settings

Settings is a list opened from Profile. It does not play audio by itself.

- **Account.** Name and email.
- **Country.** Changing country changes the currency shown on the Plans screen. Nigeria sees naira. Every other country sees US dollars. Paystack still collects the naira amount.
- **Plan.** The row says Free or Premium. Manage plan opens the Plans screen, which is the only place prices appear.
- **Downloads.** Lists files saved for offline play. Premium only. A Free account sees the row and is sent to Plans.
- **Notifications.** On or off for scheduled listening.
- **Privacy.** Clear listening history. Delete AI conversations. Delete the account.
- **Reduced motion.** Turns off the AI orb animation.
- **Support.**
- **Terms and privacy policy.**
- **Sign out.**

## Each feature on its own

**Catalogue and player.** Home, Explore, search, and the full player work for Free tracks with no other feature turned on. The player handles one track or a queue: play, pause, seek, loop, skip.

**Mini-player.** A bar above the tabs. It shows the current track and pause. Tapping it opens the full player. It does not choose music.

**Library.** Favourites, playlists, and history belong to the signed-in user. They remember choices. They do not change who may play a track.

**Studio.** A Premium mixer. Presets and saved mixes store track ids and volumes, not copies of the audio. A Free user can open Studio and is asked to upgrade before saving.

**Sleep timer.** Stops or fades whatever is already playing. It does not pick a track.

**Scheduled listening.** Starts a chosen track or saved mix at a time. It depends on the phone allowing the alarm. It does not grant access by itself.

**AI companion.** A guide that asks how the user feels, then starts a real catalogue track. It cannot invent a sound. Three states, taken from the samples in `design/example ai`:

1. **Typing.** A sheet over the app. The current track stays in a small player at the top. The user types, speaks, or taps a suggestion such as “Rain for sleep.”
2. **Speaking.** The sheet becomes a full navy screen. A mint orb means Xoundra is responding. Previous, pause, and next stay available.
3. **Playing.** The sheet returns. The chosen track is already playing in the top player, and the user can ask for something else.

**Plans and checkout.** Shows prices. Nigeria sees naira. Other countries see dollars, and Paystack is charged in naira. A successful payment is the only thing that turns an account Premium.

**Artist tools.** Apply, get verified, upload. Separate from a listener’s Premium plan. An artist is not Premium automatically.

## How they work together

The player is the shared piece. Home, Explore, Library, Studio, a schedule, and the AI companion all hand it a track id. The mini-player then follows the user across the main tabs.

Premium is one entitlement checked by the server. It unlocks Premium tracks, saving a mix, offline downloads, the sleep timer, scheduled listening, and the AI companion. Losing Premium locks those again. Favourites and playlists remain.

The AI companion does not have its own player. In the speaking state it searches the catalogue. In the playing state it gives the chosen track to the same player used everywhere else. The sleep timer can fade that track. A saved Studio mix can be what a schedule starts later.

Country and plan status meet only on the Plans screen. Settings stores the country. Profile only repeats Free or Premium. Checkout reads the country, shows the matching display price, and sends the naira amount to Paystack.
