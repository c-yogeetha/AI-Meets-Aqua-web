# Scientific References & Ethological Foundations

This document catalogs the behavioral biology literature and ethological guidelines underpinning the stress detection formulas, kinematic metrics, and care suggestions in **Matsya**.

---

## 1. Fish Behavioral Indicators & Swimming Kinematics

1. **Aquaculture Welfare Guidelines (2012)**  
   *Behavioural indicators of welfare in farmed teleosts.*  
   *Fish Physiology and Biochemistry*, 38(1), 17–41.  
   - **Key Finding**: Swimming speed exceeding 2.5 body lengths per second (BL/s) or dropping below 0.3 BL/s for prolonged periods correlates with elevated plasma cortisol levels and confinement distress.
   - **Implemented in**: `backend/app/analysis/features.py` (Speed metric calculations) and `config/scoring.yaml` (Thresholds: `fast_swimming_bl_s: 2.5`, `slow_swimming_bl_s: 0.3`).

2. **Aquatic Teleost Behavioral Studies (2006)**  
   *Welfare assessment in teleost fish.*  
   *Journal of Fish Biology*, 68(2), 332–372.  
   - **Key Finding**: Erratic trajectory changes, frequent sharp turns (>0.5 changes/sec), and sudden darting behaviors signify escape responses triggered by poor water parameters, predator cues, or irritants.
   - **Implemented in**: `backend/app/analysis/features.py` (Angular trajectory deviation rate).

3. **Conte, F. S. (2004)**  
   *Stress and the welfare of cultured fish.*  
   *Applied Animal Behaviour Science*, 86(3-4), 205–223.  
   - **Key Finding**: Spatial distribution within the water column is a sensitive indicator. Surface hovering with piping/gasping indicates dissolved oxygen hypoxia (<4.0 mg/L) or high nitrite toxicity, while bottom-huddling indicates thermal shock or physical exhaustion.
   - **Implemented in**: `backend/app/analysis/features.py` (`surface_ratio`, `bottom_ratio`).

4. **Braithwaite, V. A. (2010)**  
   *Nociception and behavioral response in teleost fish.*  
   *Oxford University Press*, Oxford.  
   - **Key Finding**: Demonstrated sensory and neural architecture in teleost fish, establishing that behavioral anomalies are active coping responses to environmental stressors.

---

## 2. Animal Welfare Standards & UN Sustainable Development Goals

1. **Five Freedoms Welfare Framework**  
   - Freedom from hunger and thirst.
   - Freedom from discomfort.
   - Freedom from pain, injury, and disease.
   - Freedom to express normal behaviour.
   - Freedom from fear and distress.
   - **Applied in**: Matsya automated care suggestion generator (`backend/app/analysis/suggestions.py`).

2. **United Nations Sustainable Development Goals (SDGs)**  
   - **SDG 6 (Clean Water and Sanitation)**: Target 6.3 - Reducing water contamination, automated tracking of tank water health.
   - **SDG 12 (Responsible Consumption and Production)**: Target 12.2 - Sustainable management of aquatic resources and aquaculture husbandry.
   - **SDG 14 (Life Below Water)**: Target 14.1 & 14.2 - Protecting aquatic ecosystems through early detection of biosecurity threats and stress anomalies.
