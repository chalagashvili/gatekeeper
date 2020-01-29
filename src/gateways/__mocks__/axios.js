module.exports = {
  post: jest.fn(() => Promise.resolve({ data: { status: 200, ok: true, error: false } })),
};
