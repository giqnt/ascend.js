import type { Promisable } from "type-fest";

/**
 * Measures the time it takes to execute a function.
 * @param fn The function to measure the time of.
 * @returns A tuple containing the result of the function and the time it took to execute it.
 */
export const measureTime = async <T>(fn: () => Promisable<T>): Promise<[T, number]> => {
    const start = performance.now();
    const result = await fn();
    return [result, performance.now() - start];
};
