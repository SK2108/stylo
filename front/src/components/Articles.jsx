import React, { useCallback, useEffect, useState } from 'react'
import { connect } from 'react-redux'

import askGraphQL from '../helpers/graphQL'
import etv from '../helpers/eventTargetValue'

import Article from './Article'
import CreateArticle from './CreateArticle'

import styles from './Articles.module.scss'
import TagManagement from './TagManagement'
import Button from './Button'
import Field from './Field'
import { Search } from 'react-feather'
import Tag from './Tag'

const mapStateToProps = ({ activeUser, sessionToken, applicationConfig }) => {
  return { activeUser, sessionToken, applicationConfig }
}

const ConnectedArticles = (props) => {
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [articles, setArticles] = useState([])
  const [tags, setTags] = useState([])
  const [filterTags, setFilterTags] = useState([])
  const [filterOwners, setFilterOwners] = useState([])
  const [creatingArticle, setCreatingArticle] = useState(false)
  const [needReload, setNeedReload] = useState(true)
  const [tagManagement, setTagManagement] = useState(false)
  const [owners, setOwners] = useState([])

  const { displayName } = props.activeUser

  const handleReload = useCallback(() => {
    setNeedReload(true)
  }, [])

  const handleUpdateTags = useCallback((articleId, tags) => {
    setArticles([...findAndUpdateArticleTags(articles, articleId, tags)])
  }, [articles])

  const handleUpdateTitle = useCallback((articleId, title) => {
    // shallow copy otherwise React won't render the components again
    setArticles([...findAndUpdateArticleTitle(articles, articleId, title)])
  }, [articles])

  const handleCloseTag = useCallback(() => {
    setTagManagement(false)
  }, [])

  const findAndUpdateTag = (tags, id) => {
    const tag = tags.find((t) => t._id === id)
    tag.selected = !tag.selected
    return tags
  }

  const findAndUpdateOwner = (owners, id) => {
    const owner = owners.find((o) => o._id === id)
    owner.selected = !owner.selected
    return owners
  }

  const findAndUpdateArticleTags = (articles, articleId, tags) => {
    const article = articles.find((a) => a._id === articleId)
    article.tags = tags
    return articles
  }

  const findAndUpdateArticleTitle = (articles, articleId, title) => {
    const article = articles.find((a) => a._id === articleId)
    article.title = title
    return articles
  }

  const filterByTagsSelected = (article) => {
    const listOfTagsSelected = [...filterTags].filter((t) => t.selected)
    if (listOfTagsSelected.length === 0) {
      return true
    }
    let pass = true
    for (let i = 0; i < listOfTagsSelected.length; i++) {
      if (!article.tags.map((t) => t._id).includes(listOfTagsSelected[i]._id)) {
        pass = false
      }
    }
    return pass
  }

  const filterByOwnerSelected = (article) => {
    const listOfOwnersSelected = [...filterOwners].filter((t) => t.selected)
    if (listOfOwnersSelected.length === 0) {
      return true
    }
    let pass = true
    for (let i = 0; i < listOfOwnersSelected.length; i++) {
      if (!listOfOwnersSelected.filter(o => o.selected).map(o => o._id).includes(article.owner._id)) {
        pass = false
      }
    }
    return pass
  }

  const query = `query($user:ID!){
    user(user:$user){
      displayName
      tags {
        _id
        owner
        description
        color
        name
      }

      articles{
        _id
        title
        updatedAt

        owner {
          _id
          displayName
        }

        contributors {
          user {
            _id
            displayName
          }
        }

        versions{
          _id
          version
          revision
          message
        }

        tags{
          name
          owner
          color
          _id
        }
      }
    }
  }`

  const user = { user: props.activeUser._id }

  useEffect(() => {
    if (needReload) {
      //Self invoking async function
      (async () => {
        try {
          const data = await askGraphQL(
            { query, variables: user },
            'fetching articles',
            props.sessionToken,
            props.applicationConfig
          )
          //Need to sort by updatedAt desc
          setArticles(data.user.articles)
          const tags = data.user.tags.map((t) => ({
            ...t,
            selected: false,
            color: t.color || 'grey',
          }))
          const owners = [
            ...new Map(
              data.user.articles.map(a => {
                if (a.owner._id === props.activeUser._id) {
                  return [a.owner._id, { ...a.owner, ...{ displayName: 'me' } }]
                } else {
                  return [a.owner._id, a.owner]
                }
              })
            ).values()
          ].sort((a, b) => {
            if (a._id === props.activeUser._id) {
              return -1
            }
            if (b._id === props.activeUser._id) {
              return 1
            }
            return a.displayName > b.displayName
          })
          setOwners(owners)
          // deep copy of owners
          setFilterOwners(structuredClone(owners))
          setTags(tags)
          // deep copy of tags
          setFilterTags(structuredClone(tags))
          setIsLoading(false)
          setNeedReload(false)
        } catch (err) {
          alert(err)
        }
      })()
    }
  }, [needReload])

  return (
    <section className={styles.section}>
      <h1>{articles.length} articles for {displayName}</h1>
      <ul className={styles.horizontalMenu}>
        <li>
          <Button primary={true} onClick={() => setCreatingArticle(true)}>
            Create new Article
          </Button>
        </li>
        <li>
          <Button onClick={() => setTagManagement(!tagManagement)}>Manage tags</Button>
        </li>
      </ul>
      <TagManagement
        tags={tags}
        close={handleCloseTag}
        focus={tagManagement}
        articles={articles}
        setNeedReload={handleReload}
      />
      {!isLoading && (
        <>
          {creatingArticle && (
            <CreateArticle
              tags={tags}
              cancel={() => setCreatingArticle(false)}
              triggerReload={() => {
                setCreatingArticle(false)
                setNeedReload(true)
              }}
            />
          )}
          <Field className={styles.searchField} type="text" icon={Search} value={filter} placeholder="Search"
                 onChange={(e) => setFilter(etv(e))}/>

          {tags.length > 0 &&
          <>
            <h4>Filter by Tags</h4>
            <ul className={styles.filterByTags}>
              {filterTags.map((t) => (
                <li key={`filterTag-${t._id}`}>
                  <Tag
                    tag={t}
                    activeUser={props.activeUser}
                    name={`filterTag-${t._id}`}
                    onClick={() => {
                      // shallow copy otherwise React won't render the components again
                      setFilterTags([...findAndUpdateTag(filterTags, t._id)])
                    }}
                  />
                </li>
              ))}
            </ul>
          </>}

          {owners.length > 0 &&
          <>
            <h4>Filter by Owner</h4>
            <ul className={styles.filterByOwner}>
              {filterOwners.map((o) => (
                <li key={`filterOwner-${o._id}`}>
                  <label className={styles.filterByOwnerLabel}>
                    <input type="checkbox" checked={o.selected} onChange={() => {
                      // shallow copy otherwise React won't render the components again
                      setFilterOwners([...findAndUpdateOwner(filterOwners, o._id)])
                    }}/>
                    {o.displayName}
                  </label>
                </li>
              ))}
            </ul>
          </>}

          <hr className={styles.horizontalSeparator} />

          {articles
            .filter(filterByTagsSelected)
            .filter(filterByOwnerSelected)
            .filter(
              (a) => a.title.toLowerCase().indexOf(filter.toLowerCase()) > -1
            )
            .map((article) => (
              <Article
                key={`article-${article._id}`}
                masterTags={tags}
                article={article}
                setNeedReload={handleReload}
                updateTagsHandler={handleUpdateTags}
                updateTitleHandler={handleUpdateTitle}
              />
            ))}
        </>
      )}
    </section>
  )
}

const Articles = connect(mapStateToProps)(ConnectedArticles)
export default Articles
