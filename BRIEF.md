# Brief: Rishi Is Turning One, a playable Hungry Caterpillar invite

## The idea
A mobile invite that is also a small storybook game. The invite is the game board. The guest steers the
caterpillar across the invite and eats through the week (Monday to Sunday) just like in the book. He grows,
builds a cocoon, and becomes the book's butterfly, which then lives on the invite and keeps flapping.
It should feel like a page from Eric Carle's book came alive: clean, bold and childlike, never techy.

## Facts (do not change)
- Rishi's first birthday. Sunday, November 22, 2026 at 3:00 PM.
- 2459 NE Daphne St, Issaquah, WA.
- Runs locally only for now. No deployment.

## Art direction (most important)
- **White page and bold color.** A clean white card, like reference 2, with saturated Carle colors:
  grass greens, teal, tomato red, sunflower yellow, orange, violet and cobalt.
- **Real Carle surface everywhere.** Every colored shape is cut paper: hand-painted tissue with brush streaks,
  dabs, layered washes, slightly uneven cut edges, and a faint shadow where the paper sits on the page.
  No flat vector fills, gradients, outlines or glossy effects.
- **Texture source:** swatches sampled directly from the supplied reference art (caterpillar greens, head red,
  "1" red, butterfly blues, violets and yellows, fruit textures). Painted-tissue swatches are generated in code
  only for colors the references don't have.
- **Shapes:** my own vector cut-outs drawn to match the book's characters. No copyrighted SVGs are pulled from the web.
- **Caterpillar:** about 11 overlapping round segments, mostly green with teal and blue-green tones. Fine
  multicolor bristles on the edges (yellow, blue, red), small brown feet under the front and tail, and a
  red head that is slightly larger. Big yellow-ringed eyes with green centers, a small dark nose, and two
  violet/blue antennae.
- **Butterfly:** the book's butterfly. Blue/teal upper wings with green and yellow rays, pink/orange eye
  spots, a navy edge with colored dots, long violet lower wings with yellow-and-red eye spots, and a slim tan body
  with a red head.
- **Foods:** apple, pear, plum, strawberry and orange, plus Saturday's chocolate cake, ice cream, pickle, Swiss
  cheese, salami, lollipop, cherry pie, sausage, cupcake and watermelon, then Sunday's leaf. Each eaten food
  keeps the book's round hole.
- **Type:** a slab "1"; heavy rounded caps with a different painted texture on each letter
  ("CATERPILLAR", "RISHI"); a friendly serif for lowercase lines; spaced small caps for the details. Matches the reference invites.
- **Page decorations:** collage sun top-left, leafy branch top-right, scattered painted confetti dots, and a fruit row at the bottom.

## Screens and flow
1. **Open:** the invite renders and the caterpillar is draped over the big "1", breathing, blinking,
   and following your finger with his eyes. A bottom sheet says hello, asks for your name (for the scoreboard),
   and offers **Let's play** or **Skip to the invite**. Returning guests see their name filled in.
2. **Invite (home):** all details are readable in 5 seconds. Add to calendar and Directions links. A small dock
   has **Feed the caterpillar** and **Scores**.
3. **Play:** the invite fades back. Day banners appear ("Monday · one apple"). The top bar shows the quit
   button, the day's foods (crossed off as eaten), the timer and the sound toggle. You touch and hold where
   he should crawl. Turning is smooth, he bends away from the walls, nothing kills him, and food hit areas are generous.
   Saturday ends in a tummy-ache wobble and Sunday's leaf makes him better.
4. **Metamorphosis (the signature moment):** he gathers in, a cocoon wraps and wobbles, it opens in a burst
   of paper confetti, the wings unfold with a spring, and the butterfly flies a banked path and lands on the invite.
5. **Result:** your time, your rank, and buttons for Invite, Play again and Scores.
6. **Scores:** best time per guest, your row highlighted, and an honest empty state.
   Scores live on this phone for now, with a hook for a shared scoreboard later.

## Motion (studied from the official animated film)
- The caterpillar moves by inching: a hump ripples from tail to head and the feet step in sequence.
- Eating: the head bobs with a quick chomp, a hole punches through the food, and the food is pulled into the mouth.
- Butterfly: upper and lower wings flap with a slight lag, and the body bobs with each stroke.
  It glides in flight and flaps slowly at rest.
- UI uses exponential ease-out and gentle springs. One big moment (metamorphosis), not scattered effects.
  Respect reduced motion.

## Quality bar
See SUCCESS-CRITERIA.md. Iterate with phone screenshots (390×844) until every item is at least 8 and the average is at least 9.
