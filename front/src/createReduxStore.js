import { applyMiddleware, compose, createStore } from 'redux'
import { toEntries } from './helpers/bibtex'
import VersionService from './services/VersionService'
import ArticleService from "./services/ArticleService"
import MetadataService from "./services/MetadataService"
import BibliographyService from "./services/BibliographyService";

function createReducer (initialState, handlers) {
  return function reducer (state = initialState, action) {
    if (Object.prototype.hasOwnProperty.call(handlers, action.type)) {
      return handlers[action.type](state, action)
    } else {
      return state
    }
  }
}

// Définition du store Redux et de l'ensemble des actions
const initialState = {
  logedIn: false,
  hasBooted: false,
  sessionToken: undefined,
  workingArticle: {
    state: 'saved',
    bibliography: {
      text: '',
      entries: []
    }
  },
  applicationConfig: {
    backendEndpoint: import.meta.env.SNOWPACK_PUBLIC_BACKEND_ENDPOINT,
    graphqlEndpoint: import.meta.env.SNOWPACK_PUBLIC_GRAPHQL_ENDPOINT,
    exportEndpoint: import.meta.env.SNOWPACK_PUBLIC_EXPORT_ENDPOINT,
    processEndpoint: import.meta.env.SNOWPACK_PUBLIC_PROCESS_ENDPOINT,
    humanIdRegisterEndpoint: import.meta.env.SNOWPACK_PUBLIC_HUMAN_ID_REGISTER_ENDPOINT,
  },
  activeUser: {},
  articleStructure: [],
  articleVersions: [],
  articlePreferences: localStorage.getItem('articlePreferences') ? JSON.parse(localStorage.getItem('articlePreferences')) : {
    expandSidebarLeft: true,
    expandSidebarRight: false,
    metadataFormMode: 'basic',
    expandVersions: false,
  },
  articleStats: {
    wordCount: 0,
    charCountNoSpace: 0,
    charCountPlusSpace: 0,
    citationNb: 0,
  },
  userPreferences: {
    trackingConsent: true /* default value should be false */
  }
}

const reducer = createReducer(initialState, {
  APPLICATION_CONFIG: setApplicationConfig,
  PROFILE: setProfile,
  CLEAR_ZOTERO_TOKEN: clearZoteroToken,
  LOGIN: loginUser,
  UPDATE_ACTIVE_USER: updateActiveUser,
  LOGOUT: logoutUser,

  // article reducers
  UPDATE_ARTICLE_STATS: updateArticleStats,
  UPDATE_ARTICLE_STRUCTURE: updateArticleStructure,

  // user preferences reducers
  USER_PREFERENCES_TOGGLE: toggleUserPreferences,

  SET_ARTICLE_VERSIONS: setArticleVersions,
  SET_WORKING_ARTICLE_UPDATED_AT: setWorkingArticleUpdatedAt,
  SET_WORKING_ARTICLE_TEXT: setWorkingArticleText,
  SET_WORKING_ARTICLE_METADATA: setWorkingArticleMetadata,
  SET_WORKING_ARTICLE_BIBLIOGRAPHY: setWorkingArticleBibliography,
  SET_WORKING_ARTICLE_STATE: setWorkingArticleState,

  ARTICLE_PREFERENCES_TOGGLE: toggleArticlePreferences,
})

const createNewArticleVersion = store => {
  return next => {
    return async (action) => {
      if (action.type === 'CREATE_NEW_ARTICLE_VERSION') {
        const { articleVersions, activeUser, applicationConfig } = store.getState()
        const userId = activeUser._id
        const { articleId, major, message } = action
        const versionService = new VersionService(userId, articleId, applicationConfig)
        const response = await versionService.createNewArticleVersion(major, message)
        store.dispatch({ type: 'SET_ARTICLE_VERSIONS', versions: [response.saveVersion, ...articleVersions] })
        return next(action)
      }
      if (action.type === 'UPDATE_WORKING_ARTICLE_TEXT') {
        const { activeUser, applicationConfig } = store.getState()
        const userId = activeUser._id
        const { articleId, text } = action
        try {
          const { updateWorkingVersion } = await new ArticleService(userId, articleId, applicationConfig).saveText(text)
          store.dispatch({ type: 'SET_WORKING_ARTICLE_STATE', workingArticleState: 'saved' })
          store.dispatch({ type: 'SET_WORKING_ARTICLE_TEXT', text })
          store.dispatch({ type: 'SET_WORKING_ARTICLE_UPDATED_AT', updatedAt: updateWorkingVersion.updatedAt })
        } catch (err) {
          console.error(err)
          store.dispatch({
            type: 'SET_WORKING_ARTICLE_STATE',
            workingArticleState: 'saveFailure',
            message: err.message
          })
        }
        return next(action)
      }
      if (action.type === 'UPDATE_WORKING_ARTICLE_METADATA') {
        const { activeUser, applicationConfig } = store.getState()
        const userId = activeUser._id
        const { articleId, metadata } = action
        try {
          const { updateWorkingVersion } = await new MetadataService(userId, articleId, applicationConfig).saveMetadata(metadata)
          store.dispatch({ type: 'SET_WORKING_ARTICLE_STATE', workingArticleState: 'saved' })
          store.dispatch({ type: 'SET_WORKING_ARTICLE_METADATA', metadata })
          store.dispatch({ type: 'SET_WORKING_ARTICLE_UPDATED_AT', updatedAt: updateWorkingVersion.updatedAt })
        } catch (err) {
          console.error(err)
          store.dispatch({ type: 'SET_WORKING_ARTICLE_STATE', workingArticleState: 'saveFailure' })
        }
        return next(action)
      }
      if (action.type === 'UPDATE_WORKING_ARTICLE_BIBLIOGRAPHY') {
        const { activeUser, applicationConfig } = store.getState()
        const userId = activeUser._id
        const { articleId, bibliography } = action
        try {
          const { updateWorkingVersion } = await new BibliographyService(userId, articleId, applicationConfig).saveBibliography(bibliography)
          store.dispatch({ type: 'SET_WORKING_ARTICLE_STATE', workingArticleState: 'saved' })
          store.dispatch({ type: 'SET_WORKING_ARTICLE_BIBLIOGRAPHY', bibliography })
          store.dispatch({ type: 'SET_WORKING_ARTICLE_UPDATED_AT', updatedAt: updateWorkingVersion.updatedAt })
        } catch (err) {
          console.error(err)
          store.dispatch({ type: 'SET_WORKING_ARTICLE_STATE', workingArticleState: 'saveFailure' })
        }
        return next(action)
      }
      return next(action)
    }
  }
}

function persistStateIntoLocalStorage ({ getState }) {
  return (next) => {
    return (action) => {
      if (action.type === 'ARTICLE_PREFERENCES_TOGGLE') {
        // we run the reducer first
        next(action)
        // we fetch the updated state
        const { articlePreferences } = getState()
        // we persist it for a later page reload
        localStorage.setItem('articlePreferences', JSON.stringify(articlePreferences))

        return
      }

      return next(action)
    }
  }
}

function setApplicationConfig (state, action) {
  const applicationConfig = {
    ...action.applicationConfig
  }

  return { ...state, applicationConfig }
}

function setProfile (state, action) {
  if (!action.user) {
    return { ...state, hasBooted: true }
  }

  const { user: activeUser } = action

  return Object.assign({}, state, {
    hasBooted: true,
    activeUser,
    sessionToken: activeUser.apiToken,
    logedIn: true,
  })
}

function clearZoteroToken (state) {
  state.activeUser.zoteroToken = null

  return state
}

function loginUser (state, { login }) {
  if (login.user && login.token) {
    return {
      ...state,
      logedIn: true,
      activeUser: {
        ...login.user,
        // dates are expected to be in timestamp string format (including milliseconds)
        createdAt: String(new Date(login.user.createdAt).getTime()),
        updatedAt: String(new Date(login.user.updatedAt).getTime()),
      },
      sessionToken: login.token,
    }
  }

  return state
}

function updateActiveUser (state, action) {
  return {
    ...state,
    activeUser: { ...state.activeUser, displayName: action.payload },
  }
}

function logoutUser (state) {
  return { ...state, ...initialState }
}


const SPACE_RE = /\s+/gi
const CITATION_RE = /(\[@[\w-]+)/gi
const REMOVE_MARKDOWN_RE = /[#_*]+\s?/gi

function updateArticleStats (state, { md }) {
  const text = (md || '').trim()

  const textWithoutMarkdown = text.replace(REMOVE_MARKDOWN_RE, '')
  const wordCount = textWithoutMarkdown
    .replace(SPACE_RE, ' ')
    .split(' ').length

  const charCountNoSpace = textWithoutMarkdown.replace(SPACE_RE, '').length
  const charCountPlusSpace = textWithoutMarkdown.length
  const citationNb = text.match(CITATION_RE)?.length || 0

  return {
    ...state, articleStats: {
      wordCount,
      charCountNoSpace,
      charCountPlusSpace,
      citationNb
    }
  }
}

function updateArticleStructure (state, { md }) {
  const text = (md || '').trim()
  const articleStructure = text
    .split('\n')
    .map((line, index) => ({ line, index }))
    .filter((lineWithIndex) => lineWithIndex.line.match(/^##+ /))
    .map((lineWithIndex) => {
      const title = lineWithIndex.line
        .replace(/##/, '')
        //arrow backspace (\u21B3)
        .replace(/#\s/g, '\u21B3')
        // middle dot (\u00B7) + non-breaking space (\xa0)
        .replace(/#/g, '\u00B7\xa0')
      return { ...lineWithIndex, title }
    })

  return { ...state, articleStructure }
}

function setArticleVersions (state, { versions }) {
  return { ...state, articleVersions: versions }
}

function setWorkingArticleUpdatedAt (state, { updatedAt }) {
  const { workingArticle } = state
  return { ...state, workingArticle: { ...workingArticle, updatedAt } }
}

function setWorkingArticleText (state, { text }) {
  const { workingArticle } = state
  return { ...state, workingArticle: { ...workingArticle, text } }
}

function setWorkingArticleMetadata (state, { metadata }) {
  const { workingArticle } = state
  return { ...state, workingArticle: { ...workingArticle, metadata } }
}

function setWorkingArticleBibliography(state, { bibliography }) {
  const bibTeXEntries = toEntries(bibliography)
  const { workingArticle } = state
  return {
    ...state,
    workingArticle: { ...workingArticle, bibliography: { text: bibliography, entries: bibTeXEntries } }
  }
}

function setWorkingArticleState (state, { workingArticleState, message }) {
  const { workingArticle } = state
  return { ...state, workingArticle: { ...workingArticle, state: workingArticleState, stateMessage: message } }
}

function toggleArticlePreferences (state, { key, value }) {
  const { articlePreferences } = state
  console.log('toggleArticlePreferences from %s to %s', articlePreferences[key], !articlePreferences[key])
  return {
    ...state,
    articlePreferences: {
      ...articlePreferences,
      [key]: value === undefined ? !articlePreferences[key] : value,
    }
  }
}

function toggleUserPreferences (state, { key }) {
  const { userPreferences } = state

  return {
    ...state,
    userPreferences: {
      ...userPreferences,
      [key]: !userPreferences[key]
    }
  }
}

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default () => createStore(reducer, composeEnhancers(
  applyMiddleware(createNewArticleVersion, persistStateIntoLocalStorage)
))
