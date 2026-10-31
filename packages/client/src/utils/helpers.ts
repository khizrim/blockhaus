// Отдельный класс исключений для ESLint

export default class Helpers {
  public static Log(level: string, ...args: unknown[]) {
    switch (level) {
      case 'INFO':
        console.info(...args);
        break;
      case 'LOG':
        console.log(...args);
        break;
      case 'ERROR':
        console.error(...args);
        break;
      default:
        break;
    }
  }
}
