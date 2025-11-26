export const randomizeEmailMetadata = (body: string, isHtml: boolean): string => {
    if (isHtml) {
        // Add random whitespace padding
        const whitespace = ' '.repeat(Math.floor(Math.random() * 5));
        // Add a random comment tag
        const comment = `<!-- ${Math.random().toString(36).substring(7)} -->`;
        return `${whitespace}${body}${comment}`;
    } else {
        // Add random whitespace padding
        const whitespace = ' '.repeat(Math.floor(Math.random() * 5));
        return `${whitespace}${body}`;
    }
};
