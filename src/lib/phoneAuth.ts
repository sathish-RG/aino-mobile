// Module-level store for Firebase phone auth ConfirmationResult.
// Not in Zustand because ConfirmationResult is not JSON-serializable.
let _result: any = null;

export const setConfirmation = (r: any) => { _result = r; };
export const getConfirmation = () => _result;
export const clearConfirmation = () => { _result = null; };
