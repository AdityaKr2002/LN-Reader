import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  FlatListProps,
} from 'react-native';

import * as WebBrowser from 'expo-web-browser';

import { ErrorView } from '@components/ErrorView/ErrorView';
import { SafeAreaView, SearchbarV2 } from '@components';

import { showToast } from '@utils/showToast';
import { scrapeSearchResults, scrapeTopNovels } from './MyAnimeListScraper';
import MalNovelCard from './TrackerNovelCard';
import { useTheme } from '@hooks/persisted';
import MalLoading from '../loadingAnimation/MalLoading';
import { BrowseMalScreenProps } from '@navigators/types';

const BrowseMalScreen = ({ navigation }: BrowseMalScreenProps) => {
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [novels, setNovels] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(0);

  const [searchText, setSearchText] = useState('');

  const malUrl = 'https://myanimelist.net/topmanga.php?type=lightnovels';

  const getNovels = useCallback(
    async (lim?: number) => {
      try {
        const data = await scrapeTopNovels(lim ?? limit);
        setNovels(before => before.concat(data));
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setNovels([]);
        setLoading(false);
        showToast(err.message);
      }
    },
    [limit],
  );

  const clearSearchbar = () => {
    getNovels();
    setLoading(true);
    setSearchText('');
  };

  const getSearchResults = async () => {
    try {
      setLoading(true);
      const data = await scrapeSearchResults(searchText);

      setNovels(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setNovels([]);
      setLoading(false);
      showToast(err.message);
    }
  };

  useEffect(() => {
    getNovels();
  }, [getNovels]);

  const renderItem: FlatListProps<any>['renderItem'] = ({ item }) => (
    <MalNovelCard
      novel={item}
      theme={theme}
      onPress={() =>
        navigation.navigate('GlobalSearchScreen', {
          searchText: item.novelName,
        })
      }
    />
  );

  const isCloseToBottom = ({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }: NativeScrollEvent) => {
    const paddingToBottom = 20;
    return (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    );
  };

  const ListEmptyComponent = useCallback(
    () => (
      <ErrorView
        errorName={error || 'No results found'}
        actions={[
          {
            name: 'Retry',
            onPress: () => {
              getNovels();
              setLoading(true);
              setError('');
            },
            icon: 'reload',
          },
        ]}
        theme={theme}
      />
    ),
    [error, theme, getNovels],
  );

  return (
    <SafeAreaView>
      <SearchbarV2
        theme={theme}
        placeholder="Search MyAnimeList"
        leftIcon="arrow-left"
        handleBackAction={() => navigation.goBack()}
        searchText={searchText}
        onChangeText={text => setSearchText(text)}
        onSubmitEditing={getSearchResults}
        clearSearchbar={clearSearchbar}
        rightIcons={[
          {
            iconName: 'earth',
            onPress: () => WebBrowser.openBrowserAsync(malUrl),
          },
        ]}
      />
      {loading ? (
        <MalLoading theme={theme} />
      ) : (
        <FlatList
          contentContainerStyle={styles.novelsContainer}
          data={novels}
          keyExtractor={(item, index) => item.novelName + index}
          renderItem={renderItem}
          ListEmptyComponent={ListEmptyComponent}
          onScroll={({ nativeEvent }) => {
            if (!searchText && isCloseToBottom(nativeEvent)) {
              getNovels(limit + 50);
              setLimit(before => before + 50);
            }
          }}
          ListFooterComponent={
            !searchText ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

export default BrowseMalScreen;

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  novelsContainer: {
    flexGrow: 1,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
});
