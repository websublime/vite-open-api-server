/**
 * Valid handler fixture for testing.
 * Exports an object with both static and dynamic handlers.
 */
export default {
  // Static handler - code as string
  addPet: `
    const newPet = {
      id: faker.string.uuid(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    return store.create('Pet', newPet);
  `,

  // Dynamic handler - function that generates code based on context
  addNewPet: ({ operation }) => {
    const has400 = operation?.responses?.['400'];
    const has422 = operation?.responses?.['422'];

    let code = `
      const { name, status, category } = req.body;
    `;

    if (has400 || has422) {
      code += `
      if (!name) {
        return res['${has400 ? '400' : '422'}'];
      }
      `;
    }

    code += `
      const newPet = {
        id: faker.number.int({ min: 1, max: 10000 }),
        name,
        status: status || 'available',
        category: category || { id: 1, name: 'Unknown' },
        photoUrls: [],
        tags: []
      };
      return store.create('Pet', newPet);
    `;

    return code;
  },
};
