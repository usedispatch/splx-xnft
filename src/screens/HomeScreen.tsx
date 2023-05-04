import { useCounts, useForums, usePosts, useTopics, useUser, useUserProfile } from "@dispatch-services/app-forum-store/modules";

import { PostboxEntityJson } from "@dispatch-services/db-forum-common/entities";
import { Screen } from "../components/Screen";
import { Text } from "react-native";
// import { useSolanaConnection } from "../hooks/xnft-hooks";
import tw from "twrnc";
import { useEffect } from "react";
import { useTime } from "@dispatch-services/store";

export function HomeScreen() : JSX.Element  {
  const forumActionId = process.env.FORUM ?? 'yjtu_Y1CgN98OJOF';
  const forum = useForums((module) => module.getters.getForum(forumActionId));
  const userId = useUser((module) => module.computed.userId);
  const topics = useTopics((module) => module.getters.getNewestTopicsForForum(forumActionId));
  // Get the topics whenever forum changes or user changes.
  useEffect(() => {
    if (forumActionId) {
      void useTopics.actions.fetchNewestTopicsForForum(forumActionId, userId);
    }
  }, [forumActionId, userId]);
  // Getting the number of topics.
  const numTopics = useCounts((module) => module.getters.getCount(forum, 'children') || topics.length);
  
  // Determine loading. IsLoading === never loaded before, IsBusy === fetching.
  const isLoadingTopics = useTopics(
    () =>
      (!forum || !topics.length) &&
      (useTopics.getters.fetchNewestTopicsForForumIsBusy(forumActionId, userId) ||
        useTopics.getters.fetchNewestTopicsForForumIsLoading(forumActionId, userId))
  );
  const noTopics = useTopics(() => !!forum && !numTopics && !isLoading);
  useEffect(() => {
    if (forumActionId) {
      void useTopics.actions.fetchNewestTopicsForForum(forumActionId, userId);
    }
  }, [forumActionId, userId]);

  const topicActionId = 'miYYnESKuCKC1JWD';
  useEffect(() => {
    void usePosts.actions.fetchNewestPostsForTopic(forumActionId, topicActionId, userId);
  }, [topicActionId, userId]);

  const topic = useTopics((module) => module.getters.getTopic(topicActionId));
  const posts = usePosts((module) => module.getters.getNewestPostsForTopic(forumActionId, topicActionId));
  const numPosts = useCounts((module) => module.getters.getCount(topic, 'children') || posts.length);
  const isLoadingPosts = usePosts(
    (module) =>
      numPosts &&
      (!topic || (posts && !posts.length)) &&
      module.getters.fetchNewestPostsForTopicIsLoading(forumActionId, topicActionId, userId)
  );
  const isLoading = usePosts(() => isLoadingPosts || isLoadingTopics );
  const noPosts = usePosts(() => !!topic && !numPosts && !isLoadingPosts);
  return (
    <Screen>
      <Text>
        <div>Solarplex v1 <span>{ isLoadingTopics || isLoadingPosts ? 'Loading' : `(${numTopics} Topics)`}</span></div>
        { topic && !isLoading &&  <Postbox postboxJson={ topic }></Postbox> }
        { !isLoading && posts.map((postboxJson) => (<Postbox key={postboxJson.id} postboxJson={ postboxJson }></Postbox>))}
      </Text>
    </Screen>
  );
}

function Postbox({ postboxJson }: { postboxJson: PostboxEntityJson}): JSX.Element  {
  const userDisplayParams = useUserProfile((m) => m.getters.getProfileDisplayParams(postboxJson));
  const userDisplayName = useUserProfile(() => userDisplayParams.wallet === userDisplayParams.displayName ? userDisplayParams.displayWallet : userDisplayParams.displayName);
  const userScore = useUserProfile((m) => m.getters.getUserScore(postboxJson.creatorId));
  const children = useCounts((m) => m.getters.getCount(postboxJson, 'children'));
  const upVotes = useCounts((m) => m.getters.getCount(postboxJson, 'upVotes'));
  const downVotes = useCounts((m) => m.getters.getCount(postboxJson, 'downVotes'));
  const score = useCounts((m) => m.getters.getCount(postboxJson, 'score'));
  const date = useTime((m) => m.getters.getFormattedDate(postboxJson.time));
  return (
    <Text>
      { postboxJson.title && <div><b>{ postboxJson.title }</b></div> }
      { postboxJson.body && <div>{ postboxJson.body }</div>}
      <div>By {`${ userDisplayName } (${ userScore })`} at { date }</div>
      <div>Up: { upVotes } Down: { downVotes } Replies: { children } Score: { score }</div>
    </Text>
  )
}