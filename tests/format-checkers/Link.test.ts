import { describe, test, expect } from 'vitest';
import Link from '../../src/format-checkers/Link.js';
import { pino, transport } from 'pino';
import { randomUUID } from 'node:crypto';

describe('Link', () => {
  const logger = pino(transport({ target: 'pino-pretty' })).child({
    id: randomUUID(),
    type: 'FormatChecker',
    checkerName: 'Link',
  });

  test('valid without emoji', () => {
    const message = `[**SUJET**] Votre description ici - https://github.com/es-community`;
    const isValid = Link.isMessageValid(message, logger);

    expect(isValid).toBe(true);
  });

  test('valid with unicode emoji', () => {
    const message = `[👍] Votre description ici - https://github.com/es-community`;
    const isValid = Link.isMessageValid(message, logger);

    expect(isValid).toBe(true);
  });

  test('valid with multiple unicode emojis', () => {
    const message = `[👍👌] Votre description ici - https://github.com/es-community`;
    const isValid = Link.isMessageValid(message, logger);

    expect(isValid).toBe(true);
  });

  test('valid with discord emoji', () => {
    const message = `[<:adonis:793993785712312361>] Breadcrumbs automatiques pour les routes sur Adonis V6 - https://adonis-breadcrumbs.pages.dev`;
    const isValid = Link.isMessageValid(message, logger);

    expect(isValid).toBe(true);
  });

  test('valid with multiple discord emojis', () => {
    const message = `[<:adonis:793993785712312361><:firefox:793993785712312369>] Breadcrumbs automatiques pour les routes sur Adonis V6 - https://adonis-breadcrumbs.pages.dev`;
    const isValid = Link.isMessageValid(message, logger);

    expect(isValid).toBe(true);
  });

  test('valid with multiple discord emojis mixed with unicode emojis', () => {
    const message = `[<:adonis:793993785712312361>🌈<:firefox:793993785712312369>👍👌] Breadcrumbs automatiques pour les routes sur Adonis V6 - https://adonis-breadcrumbs.pages.dev`;
    const isValid = Link.isMessageValid(message, logger);

    expect(isValid).toBe(true);
  });

  test('valid with discord dismissed emoji', () => {
    const message = `[:adonis:] Breadcrumbs automatiques pour les routes sur Adonis V6 - https://adonis-breadcrumbs.pages.dev`;
    const isValid = Link.isMessageValid(message, logger);

    expect(isValid).toBe(true);
  });

  test('invalid, link is missing', () => {
    const message = `[**SUJET**] Votre description ici`;
    const isValid = Link.isMessageValid(message, logger);

    expect(isValid).toBe(false);
  });

  test('invalid, separator is missing', () => {
    const message = `[**SUJET**] Votre description ici https://github.com/es-community`;
    const isValid = Link.isMessageValid(message, logger);

    expect(isValid).toBe(false);
  });
});
