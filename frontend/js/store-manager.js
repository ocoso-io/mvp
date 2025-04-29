/**
 * Creates a simple state management store with the ability to manage state, subscribe to changes, and memoize function outputs.
 *
 * @param {Object} [initialState={}] - Initial state of the store.
 * @return {Object} An object representing the store with methods to get, update, and subscribe to state changes, as well as a memoization utility.
 */
function createSimpleStore(initialState = {}) {
    let state = {...initialState};
    const listeners = [];
    const cache = new Map(); // Für Memoization

    /**
     * Caches the results of a provided function based on its arguments to improve performance for repeated invocations with the same inputs.
     *
     * @param {Function} fn - The function whose results need to be memoized.
     * @return {Function} A memoized version of the provided function.
     */
    function memoize(fn) {
        return function (...args) {
            const key = JSON.stringify(args);
            if (!cache.has(key)) {
                cache.set(key, fn(...args));
            }
            return cache.get(key);
        };
    }

    return {
        /**
         * Returns a copy of the current state object.
         * Spreads the properties of the `state` object into a new object,
         * ensuring that changes made to the returned object do not affect the original state.
         *
         * @returns {Object} A shallow copy of the current state.
         */
        getState: () => ({...state}),

        /**
         * Updates the current state with the provided updates and notifies all registered listeners.
         *
         * If the `update` parameter is a function, it is invoked with the current state, and its return value
         * is merged with the current state. Otherwise, if `update` is an object, it is merged directly with
         * the current state.
         *
         * After updating the state, the cache is cleared, and all registered listeners are called with the new state.
         *
         * @param {Function|Object} update - A function that takes the current state and returns an object to merge into the state,
         *                                   or an object to directly merge into the state.
         */
        setState: (update) => {
            state = typeof update === 'function'
                ? {...state, ...update(state)}
                : {...state, ...update};

            cache.clear(); // Cache leeren bei Änderung

            // Alle Listener benachrichtigen
            listeners.forEach(listener => listener(state));
        },

        /**
         * Registers a listener function that is called whenever the state changes.
         *
         * @param listener
         * @returns {(function(): void)|*}
         */
        subscribe: (listener) => {
            listeners.push(listener);

            // Unsubscribe-Funktion zurückgeben
            return () => {
                const index = listeners.indexOf(listener);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            };
        },

        // function with memoization
        memoize
    };
}
