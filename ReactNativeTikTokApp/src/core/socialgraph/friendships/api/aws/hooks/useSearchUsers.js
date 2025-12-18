import { useRef, useState } from 'react'
import { searchUsers as searchUsersAPI } from '../awsSocialGraphClient'

export const useSearchUsers = userID => {
  const [users, setUsers] = useState(null)
  const pagination = useRef({ size: 50 })

  const search = async keyword => {
    const res = await searchUsersAPI(
      userID,
      keyword,
      pagination.current.nextToken,
      pagination.current.size,
    )

    pagination.current.nextToken = res.nextToken

    setUsers(res.items)
  }

  const removeUserAt = index => {
    const newUsers = [...users]
    newUsers.splice(index, 1)
    setUsers(newUsers)
  }

  return {
    users,
    search,
    removeUserAt,
  }
}
