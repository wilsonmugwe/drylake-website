/*
 * Document height (px) of each public page at each matrix width, viewport 800 px tall, reduced
 * motion, measured on the local production build of main @ 6fc97b9 (2026-10-07, after PRs
 * #31-#38). responsive-matrix.spec.ts allows +15% / -25% around these before failing.
 *
 * When a deliberate content or layout change moves a page outside the band, re-measure and
 * update the numbers in the same PR, saying why in the PR body. Do not widen the tolerance.
 */
type Heights = Record<number, number>;

export const PAGE_HEIGHT_BASELINE: Record<string, Heights> = {
  // Re-baselined 2026-10-10 (homepage clarity): PR #65 added a worked example under each problem
  // without re-baselining, and this change adds the five Why Drylake reasons and grows How We Work
  // from four stages to seven, +29-35% in all, by design. Was
  // { 320: 10915, 360: 10540, 375: 10430, 390: 10395, 393: 10391, 414: 10351, 430: 10272, 768: 11145, 1024: 8979, 1440: 8702 }.
  "/": { 320: 14818, 360: 14170, 375: 13965, 390: 13969, 393: 13905, 414: 13514, 430: 13345, 768: 14056, 1024: 12095, 1440: 11295 },
  // Re-baselined 2026-10-08 (final refinement): /solutions gained the problem-led list
  // (ProblemIndex, nine problems linked to their services), +21-28% by design. Was
  // { 320: 9466, 360: 9108, 375: 8971, 390: 8915, 393: 8919, 414: 8824, 430: 8743, 768: 9149, 1024: 7158, 1440: 7064 }.
  // Re-baselined again 2026-10-10: PR #66 rewrote the problems in the owner's words and added three
  // situations, +11-16% (two widths past the band since #66, not caused by the homepage change). Was
  // { 320: 12141, 360: 11703, 375: 11498, 390: 11330, 393: 11334, 414: 11156, 430: 11024, 768: 11210, 1024: 8872, 1440: 8562 }.
  "/solutions": { 320: 14065, 360: 13333, 375: 13175, 390: 13046, 393: 13000, 414: 12712, 430: 12546, 768: 12561, 1024: 10121, 1440: 9475 },
  "/services": { 320: 2864, 360: 2831, 375: 2811, 390: 2794, 393: 2795, 414: 2783, 430: 2768, 768: 2948, 1024: 2312, 1440: 2392 },
  "/services/custom-software-development": { 320: 7093, 360: 6773, 375: 6655, 390: 6495, 393: 6497, 414: 6403, 430: 6341, 768: 5910, 1024: 5409, 1440: 5287 },
  "/services/business-automation": { 320: 6751, 360: 6499, 375: 6486, 390: 6396, 393: 6399, 414: 6298, 430: 6234, 768: 5781, 1024: 5212, 1440: 5214 },
  // 320 px +44 on 2026-10-16: the footer Company column gained the Questions link (one 44 px row); these two pages sat 1 px under the +15% band.
  "/services/systems-integration": { 320: 6936, 360: 6584, 375: 6594, 390: 6466, 393: 6412, 414: 6282, 430: 6180, 768: 5804, 1024: 5229, 1440: 5164 },
  "/services/ai-automation": { 320: 6548, 360: 6460, 375: 6414, 390: 6318, 393: 6296, 414: 6162, 430: 6084, 768: 5752, 1024: 5177, 1440: 5144 },
  // 320 px +44 on 2026-10-16: footer Questions link row (see systems-integration).
  "/services/web-development": { 320: 6900, 360: 6600, 375: 6523, 390: 6433, 393: 6408, 414: 6319, 430: 6207, 768: 5822, 1024: 5361, 1440: 5283 },
  // Re-baselined 2026-10-16 (Perth location SEO): /perth became the service-area directory, an A to Z
  // index plus all 73 areas grouped by region and type, roughly 3-4x taller by design. Was
  // { 320: 5191, 360: 5009, 375: 4999, 390: 4964, 393: 4967, 414: 4847, 430: 4798, 768: 4708, 1024: 4160, 1440: 4218 }.
  "/perth": { 320: 21859, 360: 20616, 375: 20334, 390: 20052, 393: 20005, 414: 19558, 430: 19273, 768: 15051, 1024: 13963, 1440: 13629 },
  // Re-baselined 2026-10-16 (brand story): /about gained the full brand story section (name, metaphor,
  // three-step approach, tagline), +21-29% by design. Was
  // { 320: 5962, 360: 5802, 375: 5762, 390: 5726, 393: 5728, 414: 5621, 430: 5614, 768: 5406, 1024: 4443, 1440: 4281 }.
  "/about": { 320: 7714, 360: 7430, 375: 7407, 390: 7352, 393: 7306, 414: 7150, 430: 7122, 768: 6605, 1024: 5645, 1440: 5492 },
  // Re-baselined 2026-10-13 (consultation booking): /contact gained "Option A: Book a free
  // consultation" above the unchanged enquiry form, +12-16% by design. Was
  // { 320: 3909, 360: 3738, 375: 3737, 390: 3723, 393: 3724, 414: 3689, 430: 3696, 768: 3586, 1024: 2579, 1440: 2654 }.
  // /consultation has no baseline on purpose: its height depends on live availability (the local
  // build has no database and shows the error state), so a fixed number would be meaningless.
  "/contact": { 320: 4407, 360: 4259, 375: 4266, 390: 4244, 393: 4246, 414: 4211, 430: 4194, 768: 4032, 1024: 2995, 1440: 3050 },
  // /privacy re-baselined 2026-10-10: the policy now covers APP 1.4 in full (12 sections).
  "/privacy": { 320: 6708, 360: 6158, 375: 6080, 390: 5889, 393: 5834, 414: 5617, 430: 5538, 768: 4506, 1024: 4031, 1440: 4107 },
};
