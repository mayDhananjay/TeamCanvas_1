import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { fetchWorkspaces } from '../features/workspaceSlice'
import { Loader2Icon } from 'lucide-react'
import {useUser,SignIn, useAuth} from '@clerk/react'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading,workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const {user,isLoaded} = useUser()
    const {getToken}=useAuth()

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    //initial load of workspace 
    useEffect (()=>{
        if(isLoaded && user && workspaces.length===0){
            dispatch(fetchWorkspaces({ getToken }))
        }

    },[user,isLoaded])

    if(!user){
        return(
            <div className='flex justify-center items-center
             h-screen bg-white dark:bg-zinc-950'>
                <SignIn/>

            </div>
        )
    }

    if (loading) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )
    if(workspaces.length===0){
        return(
            <div className='min-h-screen flex justify-center items-center px-6'>
                <div className='text-center max-w-md'>
                    <h2 className='text-xl font-semibold mb-2'>No workspaces yet</h2>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>Your workspace list is empty right now. Refresh after your backend returns data.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout
