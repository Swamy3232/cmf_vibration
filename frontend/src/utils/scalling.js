/**
 * Scaling utility functions for vibration magnitude data.
 */

/**
 * Applies scaling (linear or log) to a value or an array of values.
 * @param {number|number[]} val - The input magnitude value or array of values.
 * @param {'linear'|'log'} type - The scaling type.
 * @returns {number|number[]} The scaled value or array.
 */
export const applyScaling = (val, type = 'linear') => {
  const logFloor = -12; // floor for values <= 0, log10(1e-12) = -12

  if (type === 'log') {
    if (Array.isArray(val)) {
      return val.map(v => (v > 0 ? Math.log10(v) : logFloor));
    }
    return val > 0 ? Math.log10(val) : logFloor;
  }

  return val;
};
