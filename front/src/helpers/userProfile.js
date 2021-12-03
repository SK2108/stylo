import { useDispatch } from "react-redux"
import askGraphQL from "../helpers/graphQL"

export function getUserProfile(applicationConfig) {
  const query = `query {
    user {
      _id
      displayName
      authType
      firstName
      lastName
      institution
      email
      yaml
      admin
      createdAt
      updatedAt
      apiToken

      acquintances {
        _id
        email
        displayName
      }

      permissions {
        scope
        roles
        user {
          _id
          displayName
        }
      }
    }
  }`

  return askGraphQL({ query }, 'userProfile', null, applicationConfig)
}

export function useProfile () {
  const dispatch = useDispatch()

  return function refreshProfile () {
    return getUserProfile()
      .then((response) => dispatch({ type: 'PROFILE', ...response }))
  }
}
