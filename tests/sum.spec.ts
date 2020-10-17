function sum(a: number, b: number): number {
  return a + b;
}

test('Should return 2', () => {
  expect(sum(1, 1)).toBe(2);
});