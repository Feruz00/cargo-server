function isSafeFormula(formula) {
  return /^[0-9a-zA-Z_+\-*/().\s]+$/.test(formula.trim());
}

function safeEvalFormula(formula, context) {
  try {
    if (!formula) return null;
    if (!isSafeFormula(formula)) return null;

    const keys = Object.keys(context);

    const values = keys.map((k) => {
      const val = context[k];

      if (val === null || val === undefined) return 0;

      const num = Number(val);
      return isNaN(num) ? 0 : num;
    });

    const fn = new Function(...keys, `return ${formula}`);
    return fn(...values);
  } catch (e) {
    return null;
  }
}

module.exports = { safeEvalFormula };
