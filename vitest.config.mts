import { defineConfig } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
	test: {
		coverage: {
			reporter: ['html', 'lcov'],
			include: ['src/**/*.ts'],
			exclude: ['node_modules/', 'src/type-exts/', 'src/types.ts', '**/__tests__', '**/__mocks__'],
		},
	},
});
