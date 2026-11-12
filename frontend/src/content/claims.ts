export interface ClaimItem {
  id: string;
  number: string;
  title: string;
  statement: string;
  sourceNote?: string;
}

export const PROBLEM_NOTES: ClaimItem[] = [
  {
    id: "visible-delay",
    number: "01",
    title: "Stress is not always immediately visible",
    statement: "Physical symptoms such as fin rot or lesions appear long after behavioural signs have started. Early swimming deviations provide an earlier window for intervention.",
    sourceNote: "Observational aquarium welfare principle",
  },
  {
    id: "manual-limits",
    number: "02",
    title: "Manual observation misses small changes",
    statement: "Caretakers check tanks intermittently. Subtle shifts in speed, isolation from the group, or surface gasping can be missed during routine feeding.",
    sourceNote: "Aquaculture observation analysis",
  },
  {
    id: "shared-medium",
    number: "03",
    title: "Shared water means one fish can affect the tank",
    statement: "In closed aquatic systems, behavioural stress in an individual fish often signals declining water quality, oxygen depletion, or parasitic load that threatens all tank inhabitants.",
    sourceNote: "Aquatic biosecurity and water chemistry dynamics",
  },
];
