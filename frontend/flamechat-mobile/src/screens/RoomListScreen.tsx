import React from 'react'
import { Pressable, StyleSheet, Text, View, FlatList } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useRooms } from '../hooks/useRooms'
import type { RootStackParamList } from '../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function RoomListScreen() {
  const { rooms, loading } = useRooms()
  const navigation = useNavigation<Nav>()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rooms</Text>
      {loading ? <Text style={styles.meta}>Loading rooms...</Text> : null}

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={!loading ? <Text style={styles.meta}>No rooms yet.</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate('Chat', {
                roomId: item.id,
                roomName: item.name || 'Untitled Room',
              })
            }
          >
            <Text style={styles.roomName}>{item.name || 'Untitled Room'}</Text>
            {item.description ? <Text style={styles.roomDesc}>{item.description}</Text> : null}
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  meta: {
    color: '#475569',
  },
  listContainer: {
    paddingVertical: 8,
    gap: 10,
  },
  row: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  roomDesc: {
    marginTop: 4,
    color: '#334155',
  },
})