# Scientific References & Ethological Foundations

This document catalogs the peer-reviewed literature, behavioral biology standards, and ethological guidelines underpinning the stress detection formulas, behavioral metrics, and veterinary suggestions in **AI Meets Aqua**.

---

## 1. Fish Behavioral Stress & Swimming Kinematics

1. **Martins, C. I. M., et al. (2012)**  
   *Behavioural indicators of welfare in farmed fish.*  
   *Fish Physiology and Biochemistry*, 38(1), 17–41.  
   - **Key Finding**: Swimming speed exceeding 2.5 body lengths per second (BL/s) or dropping below 0.3 BL/s for prolonged periods correlates directly with elevated plasma cortisol levels and acute confinement stress.
   - **Implemented in**: `backend/app/analysis/features.py` (Speed metric calculations) and `rules.yaml` (Thresholds: `fast_swimming_bl_s: 2.5`, `slow_swimming_bl_s: 0.3`).

2. **Huntingford, F. A., et al. (2006)**  
   *Current issues in fish welfare.*  
   *Journal of Fish Biology*, 68(2), 332–372.  
   - **Key Finding**: Erratic trajectory changes, frequent sharp turns (>0.5 changes/sec), and sudden darting behaviors signify escape responses triggered by poor water parameters, predator cues, or parasitic irritation.
   - **Implemented in**: `backend/app/analysis/features.py` (Angular trajectory deviation rate).

3. **Conte, F. S. (2004)**  
   *Stress and the welfare of cultured fish.*  
   *Applied Animal Behaviour Science*, 86(3-4), 205–223.  
   - **Key Finding**: Spatial distribution within the water column is a sensitive bio-indicator. Surface hovering with piping/gasping indicates dissolved oxygen hypoxia (<4.0 mg/L) or high nitrite toxicity, while bottom-huddling indicates cold shock or physical exhaustion.
   - **Implemented in**: `backend/app/analysis/features.py` (`surface_ratio`, `bottom_ratio`).

4. **Braithwaite, V. A. (2010)**  
   *Do fish feel pain?*  
   *Oxford University Press*, Oxford.  
   - **Key Finding**: Demonstrated nociceptive neural architecture in teleost fish, establishing that behavioral anomalies are active coping responses to environmental stressors.

---

## 2. Animal Welfare Standards & UN SDGs

1. **Farm Animal Welfare Council (FAWC) – Five Freedoms**  
   - Freedom from hunger and thirst.
   - Freedom from discomfort.
   - Freedom from pain, injury, and disease.
   - Freedom to express normal behaviour.
   - Freedom from fear and distress.
   - **Applied in**: AI Meets Aqua's automated veterinary suggestion generator (`backend/app/analysis/suggestions.py`).

2. **United Nations Sustainable Development Goals (SDGs)**  
   - **SDG 6 (Clean Water and Sanitation)**: Target 6.3 - Reducing water pollution, automated tracking of tank water health.
   - **SDG 12 (Responsible Consumption and Production)**: Target 12.2 - Sustainable management of aquatic resources and aquaculture husbandry.
   - **SDG 14 (Life Below Water)**: Target 14.1 & 14.2 - Protecting aquatic ecosystems through early detection of biosecurity threats and stress epidemics.
