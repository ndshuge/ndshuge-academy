function countAnswers(a) {
  var c = [0, 0, 0, 0];
  a.forEach(function (q) { c[q.answer]++; });
  return c;
}
module.exports = { countAnswers: countAnswers };
