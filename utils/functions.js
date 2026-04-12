export function isSafeFormula(formula) {
  return /^[0-9a-zA-Z_+\-*/().\s]+$/.test(formula);
}
export function safeEvalFormula(formula, context) {
  try {
    if (!isSafeFormula(formula)) return formula;

    const keys = Object.keys(context);

    const values = keys.map((k) => {
      const val = context[k];
      if (val === null || val === undefined) return 0;

      const num = Number(val);
      return isNaN(num) ? 0 : num;
    });

    const fn = new Function(...keys, `return ${formula}`);
    return fn(...values);
  } catch {
    return formula;
  }
}
