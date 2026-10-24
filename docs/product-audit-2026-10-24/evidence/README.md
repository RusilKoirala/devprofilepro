# Evidence index

Read ../REPORT.md and ../TEST-COVERAGE.md first.

## Live failures

- tailor-result-mismatched-evidence.png and tailor-saved-report.json: generated explanations versus actual selected item IDs/types.
- dashboard-stale-downloads.png, data-export-counts.json, history-query-diagnostic.json: zero history despite saved exports; exact ambiguous-relationship error.
- editor-checks-desktop.png and exported-base-resume.png: existing output quality and readiness mismatch.
- editor-mobile-top.png and mobile-editor-measurements.json: 390px viewport, 433px document width, offscreen Checks panel.
- ats-stale-result.png: new selected PDF with previous file's report still visible.
- chat-restore-skipped-section.png: project restored, dependent section move skipped.

## Verification

- api-results.json: synthetic ATS cases, invalid waitlist inputs, signed-out redirects.
- export-integrity.json: identical saved-export re-download hash and page metadata.
- live-ai-eval.log: real-provider extraction/questions/writing on all three existing synthetic fixtures, 27 expectations passed.
- build-with-network.log: successful isolated Webpack production build.
- build-default.log: isolated default npm production build result.
- build.log: first Webpack attempt failed because Google Fonts DNS was unavailable in the sandbox.
- landing-desktop.png and landing-mobile.png: rendered public offer. Measured widths approximately 1441px and 390px.
- ats-clean-result.png and ats-missing-contact-mobile.png: public checker result screens.

## Offline reproductions

Run from the repository root:

    node --import tsx --require ./evals/stub-server-only.cjs docs/product-audit-2026-10-24/evidence/reproduce-modules.mts
    node --import tsx --require ./evals/stub-server-only.cjs docs/product-audit-2026-10-24/evidence/reproduce-fit.mts

These use actual app functions and synthetic/in-memory data. They do not authenticate, change live database records, or call a paid model. They overwrite their corresponding result JSON files.

- module-reproductions.json: shared bullet edit, short-selectable-text classification, omitted Go keyword, and omitted LaTeX location.
- fit-relevance-reproduction.json: real PDF fitting uses original rank rather than request relevance.
- clean-resume.pdf, missing-contact.pdf, blank.pdf: synthetic upload fixtures, not the owner's source documents.
- invalid.pdf and corrupt.pdf: intentionally invalid negative-test inputs.

The exported-base-resume image and editor screenshots contain the owner's resume details. No full account backup or credentials are included. The real PDFs/LaTeX/JSON downloaded through the browser remain in the normal Downloads folder.
