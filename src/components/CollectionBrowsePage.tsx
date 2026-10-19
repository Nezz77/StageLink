import { useState } from "react"
import { motion } from "motion/react"
import type { CollectionListing } from "./CollectionDetailPage"
import ArtistCollectionCard from "./ArtistCollectionCard"
import "../collections.css"

const PAGE_SIZE = 3

function pageNumbers(
  currentPage: number,
  pageCount: number,
): (number | "ellipsis")[] {
  if (pageCount <= 5)
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  const pages = new Set([1, pageCount])
  for (
    let page = Math.max(2, currentPage - 1);
    page <= Math.min(pageCount - 1, currentPage + 1);
    page++
  ) {
    pages.add(page)
  }
  const sortedPages = [...pages].sort((a, b) => a - b)
  const visiblePages: (number | "ellipsis")[] = []
  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) {
      visiblePages.push("ellipsis")
    }
    visiblePages.push(page)
  })
  return visiblePages
}

export default function CollectionBrowsePage({
  listings,
  type,
  title,
  description,
  onOpenCollection,
}: {
  listings: CollectionListing[]
  type: "artist" | "equipment"
  title: string
  description: string
  onOpenCollection: (listing: CollectionListing) => void
}) {
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const filteredListings = listings.filter((listing) =>
    listing.name.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const pageCount = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE))
  const page = Math.min(currentPage, pageCount)
  const visibleListings = filteredListings.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  )
  const visiblePages = pageNumbers(page, pageCount)
  const firstResult = filteredListings.length ? (page - 1) * PAGE_SIZE + 1 : 0
  const lastResult = Math.min(page * PAGE_SIZE, filteredListings.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="collection-browser py-12 relative restored-collections"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="collection-browser-heading">
          <div>
            <motion.h2
              className="font-display text-4xl font-bold text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {title}
            </motion.h2>
            <motion.p
              className="text-slate-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {description}
            </motion.p>
          </div>
          <label className="collection-search">
            <span>Search {type === "artist" ? "artists" : "equipment"}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setCurrentPage(1)
              }}
              placeholder={`Search ${
                type === "artist" ? "artists" : "equipment"
              }...`}
            />
          </label>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-8 pt-8 pb-12"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          {!visibleListings.length && (
            <p className="text-slate-400 col-span-full">
              {search
                ? `No ${
                    type === "artist" ? "artists" : "equipment"
                  } match your search.`
                : "No published listings yet. Check back after a provider publishes one."}
            </p>
          )}
          {visibleListings.map((listing) => (
            <motion.div
              key={listing.id}
              variants={{
                hidden: { opacity: 0, y: 40 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: "easeOut" },
                },
              }}
            >
              <ArtistCollectionCard
                listing={{ ...listing, type }}
                onOpen={onOpenCollection}
              />
            </motion.div>
          ))}
        </motion.div>

        <div className="collection-pagination">
          <p aria-live="polite">
            Showing {firstResult}–{lastResult} of {filteredListings.length}{" "}
            listings
          </p>
          {pageCount > 1 && (
            <nav aria-label="Listing pages">
              <button
                type="button"
                onClick={() => setCurrentPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </button>
              {visiblePages.map((number, index) =>
                number === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={number}
                    onClick={() => setCurrentPage(number)}
                    aria-label={`Page ${number}`}
                    aria-current={number === page ? "page" : undefined}
                  >
                    {number}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setCurrentPage(page + 1)}
                disabled={page === pageCount}
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>
      <footer className="collection-browser-footer">
        <span>STAGELINK</span>
        <span>Made for moments that matter.</span>
        <span>BACKSTAGE / 2026</span>
      </footer>
    </motion.div>
  )
}
