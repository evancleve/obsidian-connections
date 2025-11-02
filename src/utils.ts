/**
 * Removes [[]]]] from a file link, if required.
 * @param {link} string - A  object describing the connection.
 * @returns {string}
 */
export function stripLink(link: string) {
    let linkRegExp = RegExp('\\[?\\[?([^\\[\\]]+)\\]?\\]?');
    let linkResults;
    if ((linkResults = linkRegExp.exec(link)) != null) {
        return linkResults[1];
    } else {
        return link;
    }
}