module.exports = {
  getStorage: jest.fn(() => ({})),
  ref: jest.fn((storage, path) => ({ path })),
  uploadString: jest.fn().mockResolvedValue({}),
  uploadBytes: jest.fn().mockResolvedValue({}),
  getDownloadURL: jest.fn().mockResolvedValue('https://storage.googleapis.com/calori/photo.jpg'),
  deleteObject: jest.fn().mockResolvedValue(undefined),
  listAll: jest.fn().mockResolvedValue({ items: [], prefixes: [] }),
};
