const test = require('node:test')
const assert = require('node:assert/strict')
const {
  normalizeEmotion,
  getRecommendationQuery,
  getEmotionProfile,
} = require('../src/services/recommendationService')

test('normalizeEmotion handles case and whitespace', () => {
  assert.equal(normalizeEmotion(' Happy '), 'happy')
})

test('getRecommendationQuery falls back to neutral', () => {
  assert.equal(getRecommendationQuery('unknown'), 'focus study lo-fi instrumental')
})

test('getEmotionProfile supports fearful mood', () => {
  assert.equal(getEmotionProfile('fearful').query, 'calming ambient meditation sleep')
})
