import React, {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import {
  ANIMATION_DURATION,
  AVATAR_SIZE,
  BACKGROUND_COLOR,
  CLOSE_COLOR,
  DEFAULT_COLORS,
  SEEN_LOADER_COLORS,
  STORY_AVATAR_SIZE,
} from "../../core/constants";
import { StoryModalPublicMethods } from "../../core/dto/componentsDTO";
import { ProgressStorageProps } from "../../core/dto/helpersDTO";
import {
  InstagramStoriesProps,
  InstagramStoriesPublicMethods,
} from "../../core/dto/instagramStoriesDTO";
import {
  clearProgressStorage,
  getProgressStorage,
  setProgressStorage,
} from "../../core/helpers/storage";
import StoryModal from "../Modal";

const InstagramStories = forwardRef<
  InstagramStoriesPublicMethods,
  InstagramStoriesProps
>(
  (
    {
      stories,
      saveProgress = false,
      avatarBorderColors = DEFAULT_COLORS,
      avatarSeenBorderColors = SEEN_LOADER_COLORS,
      avatarSize = AVATAR_SIZE,
      storyAvatarSize = STORY_AVATAR_SIZE,
      listContainerStyle,
      avatarListContainerStyle,
      listContainerProps,
      avatarListContainerProps,
      animationDuration = ANIMATION_DURATION,
      backgroundColor = BACKGROUND_COLOR,
      showName = false,
      nameTextStyle,
      nameTextProps,
      videoAnimationMaxDuration,
      videoProps,
      closeIconColor = CLOSE_COLOR,
      isVisible = false,
      hideAvatarList = false,
      ...props
    },
    ref
  ) => {
    const [data, setData] = useState(stories);

    const seenStories = useSharedValue<ProgressStorageProps>({});
    const loadedStories = useSharedValue(false);
    const loadingStory = useSharedValue<string | undefined>(undefined);

    const modalRef = useRef<StoryModalPublicMethods>(null);

    const onPress = (id: string) => {
      loadingStory.value = id;

      if (loadedStories.value) {
        modalRef.current?.show(id);
      }
    };

    const onLoad = () => {
      loadingStory.value = undefined;
    };

    const onStoriesChange = async () => {
      seenStories.value = await (saveProgress ? getProgressStorage() : {});

      const promises = stories.map((story) => {
        const seenStoryIndex = story.stories.findIndex(
          (item) => item.id === seenStories.value[story.id]
        );
        const seenStory = story.stories[seenStoryIndex + 1] || story.stories[0];

        if (!seenStory) {
          return true;
        }

        return seenStory.mediaType !== "video"
          ? Image.prefetch(
              (seenStory.source as any)?.uri ?? seenStory.sourceUrl
            )
          : true;
      });

      await Promise.all(promises);

      loadedStories.value = true;

      if (loadingStory.value) {
        onPress(loadingStory.value);
      }
    };

    const onSeenStoriesChange = async (user: string, value: string) => {
      if (!saveProgress) {
        return;
      }

      if (seenStories.value[user]) {
        const userData = data.find((story) => story.id === user);
        const oldIndex = userData?.stories.findIndex(
          (story) => story.id === seenStories.value[user]
        );
        const newIndex = userData?.stories.findIndex(
          (story) => story.id === value
        );

        if (oldIndex! > newIndex!) {
          return;
        }
      }

      seenStories.value = await setProgressStorage(user, value);
    };

    useImperativeHandle(
      ref,
      () => ({
        spliceStories: (newStories, index) => {
          if (index === undefined) {
            setData([...data, ...newStories]);
          } else {
            const newData = [...data];
            newData.splice(index, 0, ...newStories);
            setData(newData);
          }
        },
        spliceUserStories: (newStories, user, index) => {
          const userData = data.find((story) => story.id === user);

          if (!userData) {
            return;
          }

          const newData =
            index === undefined
              ? [...userData.stories, ...newStories]
              : [...userData.stories];

          if (index !== undefined) {
            newData.splice(index, 0, ...newStories);
          }

          setData(
            data.map((value) =>
              value.id === user
                ? {
                    ...value,
                    stories: newData,
                  }
                : value
            )
          );
        },
        setStories: (newStories) => {
          setData(newStories);
        },
        clearProgressStorage,
        hide: () => modalRef.current?.hide(),
        show: (id) => {
          if (id) {
            onPress(id);
          } else if (data[0]?.id) {
            onPress(data[0]?.id);
          }
        },
        pause: () => modalRef.current?.pause()!,
        resume: () => modalRef.current?.resume()!,
        goToPreviousStory: () => modalRef.current?.goToPreviousStory()!,
        goToNextStory: () => modalRef.current?.goToNextStory()!,
        getCurrentStory: () => modalRef.current?.getCurrentStory()!,
      }),
      [data]
    );

    useEffect(() => {
      onStoriesChange();
    }, [data]);

    useEffect(() => {
      setData(stories);
    }, [stories]);

    useEffect(() => {
      if (isVisible && data[0]?.id) {
        modalRef.current?.show(data[0]?.id);
      } else {
        modalRef.current?.hide();
      }
    }, [isVisible]);

    return (
      <>
        {!hideAvatarList && (
          <ScrollView
            horizontal
            {...listContainerProps}
            {...avatarListContainerProps}
            contentContainerStyle={[
              listContainerStyle,
              avatarListContainerStyle,
            ]}
            testID="storiesList"
          >
            {data.map(
              (story) =>
                story.renderAvatar?.() ??
                ((story.avatarSource || story.imgUrl) && (
                  <TouchableOpacity
                    style={[styles.container]}
                    onPress={() => onPress(story.id)}
                  >
                    <TouchableOpacity
                      hitSlop={{
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10,
                      }}
                      style={[styles.container, styles.iconCon]}
                    >
                      <Image
                        source={{ uri: story?.avatarSource?.uri }}
                        resizeMode={"cover"}
                        style={[
                          {
                            width: "100%",
                            height: "100%",
                          },
                          styles.icon,
                        ]}
                      />
                    </TouchableOpacity>
                    <View style={{ maxWidth: 104 }}>
                      <Text
                        numberOfLines={2}
                        style={{
                          color: "black",
                          lineHeight: 16,
                        }}
                      >
                        {story?.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
            )}
          </ScrollView>
        )}
        <StoryModal
          ref={modalRef}
          stories={data}
          seenStories={seenStories}
          duration={animationDuration}
          storyAvatarSize={storyAvatarSize}
          onLoad={onLoad}
          onSeenStoriesChange={onSeenStoriesChange}
          backgroundColor={backgroundColor}
          videoDuration={videoAnimationMaxDuration}
          videoProps={videoProps}
          closeIconColor={closeIconColor}
          {...props}
        />
      </>
    );
  }
);

export default memo(InstagramStories);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    borderRadius: 8,
    backgroundColor: "white",
    paddingHorizontal: 12,
  },
  icon: {
    height: 44,
    width: 38,
  },
  iconCon: {
    justifyContent: "center",
    alignItems: "center",
    height: 80,
    width: 80,
    borderRadius: 40,
    backgroundColor: "#091E3E",
    marginBottom: 20,
    marginHorizontal: 16,
  },
});
