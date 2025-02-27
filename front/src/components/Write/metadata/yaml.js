/* global structuredClone */
import YAML from 'js-yaml'

export function cleanOutput(object) {
  let cleaning = structuredClone(object)

  if (ObjectIsEmpty(cleaning)) {
    return ''
  }

  for (const propName in cleaning) {
    if (
      cleaning[propName] === null ||
      cleaning[propName] === undefined ||
      cleaning[propName] === ''
    ) {
      delete cleaning[propName]
    }
    if (Array.isArray(cleaning[propName]) && cleaning[propName].length === 0) {
      delete cleaning[propName]
    }
    if (ObjectIsEmpty(cleaning[propName])) {
      delete cleaning[propName]
    }
  }
  return cleaning
}

export function ObjectIsEmpty(object) {
  return typeof object === 'object' && Object.keys(object).length === 0
}

export function toYaml(formData) {
  return '---\n' + YAML.dump(cleanOutput(formData), { sortKeys: true }) + '---'
}
