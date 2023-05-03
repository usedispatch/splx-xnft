import { useCounts, useForums, useTopics, useUser } from "@dispatch-services/app-forum-store/modules";

import { Screen } from "../components/Screen";
import { Text } from "react-native";
// import { useSolanaConnection } from "../hooks/xnft-hooks";
import tw from "twrnc";
import { useEffect } from "react";

export function HomeScreen() : JSX.Element  {
  const forumActionId = process.env.FORUM;
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
  const isLoading = useTopics(
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
  
  return (
    <Screen>
      <Text>
        Solarplex v1 <span>{ isLoading ? 'Loading' : `(${numTopics} Topics)`}</span>
        {topics.map((t) => {
          return (<div key={t.id}>{t.title}</div>);
        })}
      </Text>
    </Screen>
  );
}