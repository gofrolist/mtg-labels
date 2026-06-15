/**
 * Maximum number of label items a single PDF request may generate.
 *
 * Mirrors the backend `MAX_INPUT_ITEMS` cap (see backend `src/config.py`), which
 * bounds both the number of selected sets/types and the set x divider-letter
 * cross-product. The backend rejects anything larger with HTTP 400, so the
 * frontend guards against it up front. Keep this value in sync with the backend.
 */
export const MAX_LABEL_ITEMS = 500
