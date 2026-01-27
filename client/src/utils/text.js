export function pluralize(count, singular, plural = `${singular}s`) {
    return count === 1 ? singular : plural;
}

export function countWithLabel(count, singular, plural) {
    return `${count} ${pluralize(count, singular, plural)}`;
}
