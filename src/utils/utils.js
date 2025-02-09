// Debounce polyfill
export function debounce(func, delay) {
    let timer;
    function debounced(...args) {
        if(timer) clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
};