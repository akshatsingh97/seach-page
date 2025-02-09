// Debounce polyfill
export function debounce(func, delay) {
    let timer;
    function debounced(...args) {
        if(timer) clearTimeout(timer);
        const context = this;
        timer = setTimeout(() => func.apply(context, args), delay);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
};