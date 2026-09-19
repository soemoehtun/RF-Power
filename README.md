# RF Power Calculator

An interactive, client-side **RF Power Calculator & Unit Converter** designed for RF engineers, telecommunications professionals, and amateur radio operators. Convert RF power values between **Watts (W)**, **Milliwatts (mW)**, **dBm**, and **dBW** with real-time updates and zero server dependencies.

---

## Features

- **Pure Unit Converter**: Dedicated solely to RF power conversion — intentionally omits voltage, current, resistance, and Ohm's Law.
- **Watts as Base Unit**: All calculations route through linear Watts to eliminate rounding drift and guarantee mathematical consistency across all units.
- **Real-Time & Manual Conversion**: Results update automatically as you type or change units, with a dedicated **Calculate** button for manual execution.
- **Strict Input Validation**:
  - Distinguishes empty input, zero, positive, negative, and non-numeric values.
  - Watts and milliwatts must be strictly $> 0$.
  - Negative values are fully supported for dBm (e.g. $-120\text{ dBm}$) and dBW (e.g. $-30\text{ dBW}$).
  - Guarded against `NaN` and `Infinity` outputs.
- **Engineering-Friendly Number Formatting**:
  - Up to 6 decimal places for linear units (W, mW), with scientific notation for extreme microwatt/picowatt levels.
  - Up to 3 decimal places for logarithmic units (dBm, dBW) with trailing zeros trimmed for clean integer presentation.
- **Clean Telecom UI**:
  - Deep navy `#0f2744` header block with flush tabbed navigation.
  - Centered card container on a neutral `#eceff2` background.
  - Two-column **Output** table with bold left-aligned labels on light gray cells and right-aligned monospace values.
  - **Formulas & Theory** tab with complete conversion formulas and practical RF rules of thumb (+3 dB, +10 dB).
- **Single-File Deployment Ready**: Bundles cleanly into a self-contained HTML file through `vite-plugin-singlefile`.

---

## Supported Units

| Unit | Name | Reference Level | Typical Domain |
|---|---|---|---|
| **W** | Watts | Absolute SI unit | Transmitters, base stations, amplifiers |
| **mW** | Milliwatts | $1\text{ mW} = 0.001\text{ W}$ | Wi-Fi, Bluetooth, consumer wireless |
| **dBm** | Decibel-milliwatts | $0\text{ dBm} = 1\text{ mW}$ | Receiver sensitivity, link budgets, spectrum analyzers |
| **dBW** | Decibel-watts | $0\text{ dBW} = 1\text{ W}$ | High-power amplifiers, satellite uplinks, broadcast |

---

## Conversion Formulas

Every conversion flows through Watts:

$$\text{User Input} \longrightarrow \text{Watts} \longrightarrow \{\text{W},\, \text{mW},\, \text{dBm},\, \text{dBW}\}$$

### Input $\rightarrow$ Watts

$$\text{Watts} = \begin{cases}
W & \text{if input in W} \\
\frac{mW}{1000} & \text{if input in mW} \\
10^{\frac{dBm - 30}{10}} & \text{if input in dBm} \\
10^{\frac{dBW}{10}} & \text{if input in dBW}
\end{cases}$$

### Watts $\rightarrow$ Target Units

$$\begin{aligned}
\text{mW} &= \text{Watts} \times 1000 \\
\text{dBm} &= 10 \times \log_{10}(\text{Watts} \times 1000) \\
\text{dBW} &= 10 \times \log_{10}(\text{Watts}) \\
\text{dBm} - \text{dBW} &\equiv 30\text{ dB} \quad \text{(fixed offset)}
\end{aligned}$$

---

## Quick Reference Verification Cases

| Test | Input Unit | Input Value | Expected Watts | Expected mW | Expected dBm | Expected dBW |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | dBm | `0` | $0.001\text{ W}$ | $1\text{ mW}$ | $0\text{ dBm}$ | $-30\text{ dBW}$ |
| 2 | dBm | `30` | $1\text{ W}$ | $1000\text{ mW}$ | $30\text{ dBm}$ | $0\text{ dBW}$ |
| 3 | dBm | `37` | $\approx 5.01187\text{ W}$ | $\approx 5011.87\text{ mW}$ | $37\text{ dBm}$ | $7\text{ dBW}$ |
| 4 | dBW | `0` | $1\text{ W}$ | $1000\text{ mW}$ | $30\text{ dBm}$ | $0\text{ dBW}$ |
| 5 | dBm | `-30` | $0.000001\text{ W}$ | $0.001\text{ mW}$ | $-30\text{ dBm}$ | $-60\text{ dBW}$ |

---

## Project Structure

```text
├── index.html          # HTML entry point
├── package.json        # Dependencies and scripts
├── vite.config.ts      # Vite config with singlefile plugin
├── tsconfig.json       # TypeScript configuration
├── DESIGN.md           # UI/UX design tokens and layout specification
├── README.md           # Project documentation
└── src/
    ├── main.tsx        # React root mount
    ├── App.tsx         # Single-component RF Power Calculator implementation
    ├── index.css       # Tailwind CSS v4 entry point
    └── utils/
        └── cn.ts       # Class merging utility
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or later recommended)
- `npm`

### Installation

```bash
npm install
```

### Development Server

Start the local Vite dev server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173`.

### Production Build

Build the production bundle into a single self-contained HTML file inside `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Standalone Usage

The build output `dist/index.html` is completely inlined — HTML, CSS, and JavaScript live in a single file. You can double-click it to open directly in any browser without needing a web server or internet connection.

---

## License

MIT
