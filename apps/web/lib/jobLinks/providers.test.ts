import { classify, normalizeLinkedIn } from './providers';

test('classifies domains', () => {
  expect(classify('https://www.linkedin.com/jobs/view/123')).toBe('linkedin');
  expect(classify('https://boards.greenhouse.io/foo')).toBe('greenhouse');
  expect(classify('https://jobs.lever.co/bar')).toBe('lever');
  expect(classify('https://acme.myworkdayjobs.com/en-US/job/..')).toBe('workday');
});

test('normalizes linkedin', () => {
  const n = normalizeLinkedIn('https://www.linkedin.com/jobs/view/123?trk=blah#frag');
  expect(n).toBe('https://www.linkedin.com/jobs/view/123');
});
