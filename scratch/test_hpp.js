import { calculateProductHpp } from '../server/rules.js';

// Case 1: Product with NO recipe and a manual HPP
const productWithManualHpp = {
  name: 'Lychee Tea',
  category: 'espresso_based',
  sellingPrice: 18000,
  active: true,
  recipe: [],
  hpp: 6500,
};

const calculatedHpp1 = calculateProductHpp(productWithManualHpp, []);
console.log('Test Case 1 (Manual HPP without recipe):');
console.log('Expected HPP: 6500');
console.log('Calculated HPP:', calculatedHpp1);
if (calculatedHpp1 === 6500) {
  console.log('✅ Success!');
} else {
  console.log('❌ Failed!');
}

// Case 2: Product with NO recipe and NO HPP
const productNoHpp = {
  name: 'Plain Tea',
  category: 'espresso_based',
  sellingPrice: 10000,
  active: true,
  recipe: [],
};

const calculatedHpp2 = calculateProductHpp(productNoHpp, []);
console.log('\nTest Case 2 (No recipe and no HPP):');
console.log('Expected HPP: 0');
console.log('Calculated HPP:', calculatedHpp2);
if (calculatedHpp2 === 0) {
  console.log('✅ Success!');
} else {
  console.log('❌ Failed!');
}
