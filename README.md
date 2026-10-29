# svm

Interactive teaching demo of support vector machines, a companion to
[Logistic regression, visually](https://github.com/matthigger/logistic_regression)
and [Decision trees, visually](https://github.com/matthigger/decision_tree).
Notation follows the DS 4400 notes: weights **w**, offset b, labels ±1,
ŷ = sign(w·x − b). Three tabs:

- **Margin geometry.** Six steps from the line w·x = 0 to the margin of any
  point: the slope −w₀/w₁; w orthogonal to the line; rescaling w and b
  together leaves the line alone, so take ‖w‖ = 1; bw lies on the line; a
  point αw has margin α − b; projecting any x onto the w axis gives
  x·w − b, or (w·x − b)/‖w‖ for any length of w. Drag w's tip, the line
  and the points; the readout shows the arithmetic live.
- **Hard margin.** The widest line: its street, the support vectors with
  their α, and w = Σ αᵢyᵢxᵢ drawn head to tail. Drag a non-support sample
  and nothing moves.
- **Soft margin.** A C slider; slack drawn as a stick from each violating
  sample to its own margin line (inside the margin, or the wrong side);
  the margin and support-vector count swept over C (click the sweep to
  set C); and under it each sample's slack on the hinge
  max(0, 1 − y(w·x − b)).

Fits come from an SMO solver on the dual (`js/svm.js`); C = 1e5 stands in
for the hard margin. It matches sklearn's `SVC(kernel="linear")` to four
decimals (sklearn's `intercept_` is −b).

Dragging a sample refits; clicking a sample flips its class.

Plain HTML/CSS/JS with SVG: no build step and no dependencies.

## Run locally

Open `index.html` in a browser, or serve it:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

Link straight to a tab with `#geometry`, `#hard` or `#soft`.

## Publish on GitHub Pages

Pages is built by `.github/workflows/pages.yml` on every push to `main`. It
stamps `js/version.js` with the commit and build time, which the footer
shows ("local copy" when run locally). One-time setup:

```sh
gh repo create matthigger/svm --public --source . --push
gh api -X POST repos/matthigger/svm/pages -f build_type=workflow
```

The site then lives at <https://matthigger.github.io/svm/>.

## Layout

| file | role |
|------|------|
| `index.html` | page, explanation text, step captions, controls |
| `style.css` | layout, class palette, plot styles |
| `js/ui.js` | plane geometry, vector math, SVG lines and arrows, dragging |
| `js/data.js` | seeded two-blob data, labels ±1 |
| `js/svm.js` | linear SVM by SMO (hard and soft margin) |
| `js/geometry.js` | margin geometry tab (six steps) |
| `js/hard.js` | hard margin tab |
| `js/soft.js` | soft margin tab |
| `js/main.js` | tab switching |
| `js/version.js` | build stamp, overwritten at deploy |
| `.github/workflows/pages.yml` | Pages deploy |
