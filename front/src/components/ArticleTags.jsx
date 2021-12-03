import React from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { useGraphQL } from '../helpers/graphQL'

import Tag from './Tag'

export default function ArticleTags ({ article, masterTags, stateTags, setTags }) {
  const activeUser = useSelector(state => state.activeUser, shallowEqual)
  const runQuery = useGraphQL()
  const articleId = article._id
  const isArticleOwner = activeUser._id === article.owner._id

  const addToTags = async (tag) => {
    setTags([...stateTags, { ...tag, selected: true }])

    try {
      const query = `mutation($article:ID!,$tag:ID!,$user:ID!){addToTag(article:$article,tag:$tag,user:$user){ _id }}`
      const variables = {
        article: articleId,
        tag: tag._id,
        user: activeUser._id,
      }
      await runQuery({ query, variables })
    } catch (err) {
      alert(err)
    }
  }

  const rmFromTags = async (id) => {
    setTags(stateTags.filter((t) => t._id !== id))
    try {
      const query = `mutation($article:ID!,$tag:ID!,$user:ID!){removeFromTag(article:$article,tag:$tag,user:$user){ _id }}`
      const variables = {
        article: articleId,
        tag: id,
        user: activeUser._id,
      }
      await runQuery({ query, variables })
    } catch (err) {
      alert(err)
    }
  }

  return (
    <ul>
      {stateTags.map((tag) => (
        <li key={`article-${articleId}-${tag._id}`}>
          <Tag tag={tag}
               activeUser={activeUser}
               name={`articleTag-${tag._id}`}
               onClick={() => rmFromTags(tag._id)}
          />
        </li>
      ))}

      {isArticleOwner && masterTags
        .filter((t) => !stateTags.map((u) => u._id).includes(t._id))
        .map((tag) => (
          <li
            key={`article-${articleId}-${tag._id}`}
          >
            <Tag tag={tag}
                 activeUser={activeUser}
                 name={`articleTag-${tag._id}`}
                 onClick={() => addToTags(tag)}
            />
          </li>
        ))}
    </ul>
  )
}
