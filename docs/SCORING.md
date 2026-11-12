# Matsya Scoring Methodology & Behavioral Formulation

This document details the mathematical formulations and kinematic rules used by Matsya to evaluate teleost fish stress from video recordings.

---

## 1. Kinematic Feature Extraction

Each tracked fish $i$ across video frames $t \in [1, T]$ produces a 2D trajectory of bounding boxes:
$$\mathcal{B}_i(t) = (x_t, y_t, w_t, h_t)$$

From this trajectory, the pipeline extracts five core kinematic features:

### 1.1 Swimming Speed ($v_i$)
The instantaneous Euclidean displacement per unit time, normalized by the fish body length ($BL \approx \max(w_t, h_t)$):
$$v_i(t) = \frac{\sqrt{(x_t - x_{t-1})^2 + (y_t - y_{t-1})^2}}{\Delta t \cdot BL}$$
- **Normal Range**: $0.5 \le v \le 2.0$ BL/s
- **Elevated Stress**: $v > 2.5$ BL/s (frantic darting or escape attempts)
- **Depressed Stress**: $v < 0.3$ BL/s for extended durations (lethargy, hypothermia, or nitrate toxicity)

### 1.2 Angular Turning Deviation Rate ($\Delta \theta_i$)
Measures heading angle variations between successive velocity vectors:
$$\Delta \theta_i(t) = \arccos\left(\frac{\mathbf{v}_t \cdot \mathbf{v}_{t-1}}{\|\mathbf{v}_t\| \|\mathbf{v}_{t-1}\|}\right)$$
The angular deviation frequency $F_{turn}$ computes the count of direction changes exceeding $\pi/3$ (60 degrees) per second.
- **Normal Range**: $< 0.4$ turns/s
- **High Stress**: $\ge 0.5$ turns/s (erratic swimming, disorientation, or skin irritation)

### 1.3 Surface Hovering & Gasping Ratio ($R_{surf}$)
The fraction of recording time a fish remains in the uppermost 20% of the water column ($y_t \le 0.20 \cdot H_{tank}$):
$$R_{surf} = \frac{1}{T} \sum_{t=1}^T \mathbb{I}(y_t \le 0.20 \cdot H_{tank})$$
- **High Stress Indicator**: Surface gasping (piping) correlates strongly with dissolved oxygen depletion ($DO < 4.0$ mg/L) or gill parasitic infestation.

### 1.4 Bottom Freezing Ratio ($R_{bot}$)
The fraction of recording time a fish remains stationary in the bottom 20% of the water column ($y_t \ge 0.80 \cdot H_{tank}$ with $v_t < 0.2$ BL/s):
$$R_{bot} = \frac{1}{T} \sum_{t=1}^T \mathbb{I}(y_t \ge 0.80 \cdot H_{tank} \land v_t < 0.2)$$
- **High Stress Indicator**: Bottom huddling indicates cold shock ($< 18^\circ\text{C}$), osmotic stress, or exhaustion.

### 1.5 Schooling Dispersion ($D_{disp}$)
The normalized mean distance from an individual fish to the shoal centroid $\mathbf{C}(t)$:
$$D_{disp}(i) = \frac{1}{T} \sum_{t=1}^T \frac{\|\mathbf{p}_i(t) - \mathbf{C}(t)\|}{W_{tank}}$$
- **Social Stress**: Solitary isolation or abnormal dispersion indicates social exclusion or physical impairment.

---

## 2. Individual Fish Stress Score ($S_{fish}$)

Each kinematic feature maps to a sub-score $s_k \in [0, 100]$ via piecewise linear transfer functions configured in `config/scoring.yaml`. The composite fish score is computed as:
$$S_{fish} = \sum_{k=1}^5 w_k \cdot s_k$$
where $\sum w_k = 1.0$.

Default weights:
- Speed Deviation ($w_{speed}$): 0.25
- Turning Erraticism ($w_{turn}$): 0.25
- Surface Gasping ($w_{surf}$): 0.25
- Bottom Freezing ($w_{bot}$): 0.15
- Schooling Dispersion ($w_{disp}$): 0.10

---

## 3. Tank-Level Fish Stress Index (FSI)

The overall tank score is the arithmetic mean of individual fish scores:
$$\text{FSI}_{tank} = \frac{1}{N} \sum_{i=1}^N S_{fish, i}$$

### Longitudinal Fleet Stress Index
When evaluating multiple historical observations across time, the longitudinal FSI applies an exponential decay weighting favoring recent observations:
$$\text{FSI}_{long} = \frac{\sum_{j=1}^M w_j \cdot \text{FSI}_j}{\sum_{j=1}^M w_j}$$
Weights default to $[0.40, 0.25, 0.20, 0.10, 0.05]$ for the 5 most recent observations.

---

## 4. Stress Classification Categories

| Score Range | Category | Caretaker Action |
| :--- | :--- | :--- |
| **0 – 35** | **Normal** | Optimal welfare. Routine maintenance and scheduled feeding. |
| **36 – 65** | **Moderate** | Elevated behavioral variance. Verify water temperature and perform 15-20% water change. |
| **66 – 100** | **High** | Acute stress indicators detected. Check aeration immediately; test ammonia, nitrite, and pH levels. |

---

## 5. Video Quality Reliability Rating

To ensure transparent decision support, each analysis computes a quality reliability score $Q \in [0, 100]$:
$$Q = 100 - (\Delta Q_{sharp} + \Delta Q_{bright} + \Delta Q_{contrast} + \Delta Q_{shake})$$

- **Sharpness**: Laplacian variance on 640px normalized frames ($> 80$ variance expected).
- **Brightness**: Mean luminance across sampled frames ($[40, 220]$ expected).
- **Contrast**: Standard deviation of pixel intensities ($> 30$ expected).
- **Camera Stability**: Inter-frame translation via phase correlation ($< 15$ px expected).

Analyses with $Q < 60$ display a prominent confidence warning advising caretakers to re-record under stable, well-lit conditions.
