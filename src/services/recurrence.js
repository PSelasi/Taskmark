const { RRule, RRuleSet, rrulestr } = require('rrule');

function parseRecurrenceRule(ruleText, dtstart) {
  if (!ruleText) return null;

  try {
    if (typeof ruleText === 'string' && ruleText.startsWith('DTSTART')) {
      return rrulestr(ruleText, { forceset: true });
    }

    return rrulestr(ruleText, { dtstart, forceset: true });
  } catch (error) {
    console.error('Invalid recurrence rule:', error);
    return null;
  }
}

function getNextOccurrence(ruleText, dtstart, after = new Date()) {
  const rule = parseRecurrenceRule(ruleText, dtstart);
  if (!rule) return null;

  if (rule instanceof RRuleSet) {
    return rule.after(after, true) || null;
  }

  if (rule instanceof RRule) {
    return rule.after(after, true) || null;
  }

  return null;
}

module.exports = { parseRecurrenceRule, getNextOccurrence };