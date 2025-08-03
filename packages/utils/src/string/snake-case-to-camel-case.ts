export function snakeCaseToCamelCase(snakeCase: string): string {
    return snakeCase.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}